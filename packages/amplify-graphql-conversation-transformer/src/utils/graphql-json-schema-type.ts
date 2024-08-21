import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { InputValueDefinitionNode, Kind, NamedTypeNode, TypeNode, TypeSystemDefinitionNode } from 'graphql';
import { isScalar, getBaseType } from 'graphql-transformer-common';
import { GraphQLScalarJSONSchemaDefinition } from './graphql-scalar-json-schema-definitions';

export function generateJSONSchemaFromTypeNode(
  typeNode: TypeNode,
  ctx: TransformerContextProvider,
  schema: JSONSchema = { type: '' },
): JSONSchema {
  const generateJSONSchemaForDef = (def: TypeSystemDefinitionNode, schema: JSONSchema): Record<string, JSONSchema> => {
    if (def.kind === 'InputObjectTypeDefinition') {
      const properties = def.fields?.reduce((acc: Record<string, JSONSchema>, field) => {
        acc[field.name.value] = generateJSONSchemaFromTypeNode(field.type, ctx, { type: '' });
        if (field.type.kind === Kind.NON_NULL_TYPE) {
          schema.required = [...(schema.required || []), field.name.value];
        }
        return acc;
      }, {});
      if (!properties) {
        throw new Error(`Object type ${def.name.value} has no fields`);
      }
      return properties;
    } else if (def.kind === 'EnumTypeDefinition') {
      return {
        [def.name.value]: {
          type: 'string',
          enum: def.values?.map((value) => value.name.value),
        },
      };
    } else {
      throw new Error(`Unsupported type definition: ${def.kind}`);
    }
  };

  switch (typeNode.kind) {
    case Kind.NAMED_TYPE:
      const namedTypeSchema = processNamedType(typeNode, ctx);
      Object.assign(schema, namedTypeSchema);
      if (isScalar(typeNode)) {
        return schema;
      }

      const baseTypeName = getBaseType(typeNode);
      const typeDef = ctx.output.getType(baseTypeName);
      if (!typeDef) {
        throw new Error(`Type ${baseTypeName} not found`);
      }
      // TODO: Support arbitrary levels of nesting for object types
      schema.properties = generateJSONSchemaForDef(typeDef, schema);
      return schema;
    case Kind.NON_NULL_TYPE:
      // if (isDisallowedScalarType(getBaseType(typeNode))) {
      //   throw new Error(`
      //     Disallowed required field type ${getBaseType(typeNode)} without a default value.
      //     Use one of the supported scalar types for generation routes: [${supportedScalarTypes.join(', ')}]`);
      // }
      return generateJSONSchemaFromTypeNode(typeNode.type, ctx, schema);
    case Kind.LIST_TYPE:
      return {
        type: 'array',
        items: generateJSONSchemaFromTypeNode(typeNode.type, ctx),
      };
  }
}

function processNamedType(namedType: NamedTypeNode, ctx: TransformerContextProvider): JSONSchema {
  switch (namedType.name.value) {
    case 'Int':
      return GraphQLScalarJSONSchemaDefinition.Int;
    case 'Float':
      return GraphQLScalarJSONSchemaDefinition.Float;
    case 'String':
      return GraphQLScalarJSONSchemaDefinition.String;
    case 'ID':
      return GraphQLScalarJSONSchemaDefinition.ID;
    case 'Boolean':
      return GraphQLScalarJSONSchemaDefinition.Boolean;
    case 'AWSJSON':
      return GraphQLScalarJSONSchemaDefinition.AWSJSON;
    case 'AWSEmail':
      return GraphQLScalarJSONSchemaDefinition.AWSEmail;
    case 'AWSDate':
      return GraphQLScalarJSONSchemaDefinition.AWSDate;
    case 'AWSTime':
      return GraphQLScalarJSONSchemaDefinition.AWSTime;
    case 'AWSDateTime':
      return GraphQLScalarJSONSchemaDefinition.AWSDateTime;
    case 'AWSTimestamp':
      return GraphQLScalarJSONSchemaDefinition.AWSTimestamp;
    case 'AWSPhone':
      return GraphQLScalarJSONSchemaDefinition.AWSPhone;
    case 'AWSURL':
      return GraphQLScalarJSONSchemaDefinition.AWSURL;
    case 'AWSIPAddress':
      return GraphQLScalarJSONSchemaDefinition.AWSIPAddress;
    default:
      // For custom object types
      return {
        type: 'object',
        properties: {},
        required: [],
      };
  }
}

export type JSONLike = string | number | boolean | null | { [key: string]: JSONLike } | JSONLike[];

export type JSONSchema = {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: (string | number | boolean | null)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  description?: string;
  default?: JSONLike;
  additionalProperties?: boolean | JSONSchema;
};

import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  EnumTypeDefinitionNode,
  Kind,
  ListTypeNode,
  NamedTypeNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  TypeNode,
  TypeSystemDefinitionNode,
} from 'graphql';
import { getBaseType, isScalar } from 'graphql-transformer-common';
import { GraphQLScalarJSONSchemaDefinition, isDisallowedScalarType, supportedScalarTypes } from './graphql-scalar-json-schema-definitions';

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

/**
 * Generates a JSON Schema from a GraphQL TypeNode.
 * @param {TypeNode} typeNode - The GraphQL TypeNode to convert.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} [schema={ type: '' }] - The initial schema object.
 * @returns {JSONSchema} The generated JSON Schema.
 */
export const generateJSONSchemaFromTypeNode = (
  typeNode: TypeNode,
  ctx: TransformerContextProvider,
  schema: JSONSchema = { type: '' },
): JSONSchema => {
  switch (typeNode.kind) {
    case Kind.NAMED_TYPE:
      return handleNamedType(typeNode, ctx, schema);
    case Kind.NON_NULL_TYPE:
      return handleNonNullType(typeNode, ctx, schema);
    case Kind.LIST_TYPE:
      return handleListType(typeNode, ctx);
  }
};

/**
 * Handles the conversion of a NamedTypeNode to JSON Schema.
 * @param {NamedTypeNode} typeNode - The NamedTypeNode to process.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} schema - The current schema object.
 * @returns {JSONSchema} The updated JSON Schema.
 */
const handleNamedType = (typeNode: NamedTypeNode, ctx: TransformerContextProvider, schema: JSONSchema): JSONSchema => {
  const namedTypeSchema = processNamedType(typeNode);
  Object.assign(schema, namedTypeSchema);

  if (isScalar(typeNode)) {
    return schema;
  }

  const baseTypeName = getBaseType(typeNode);
  const typeDef = ctx.output.getType(baseTypeName);
  if (!typeDef) {
    throw new Error(`Type ${baseTypeName} not found`);
  }

  schema.properties = generateJSONSchemaForDef(typeDef, ctx, schema);
  return schema;
};

/**
 * Handles the conversion of a NonNullTypeNode to JSON Schema.
 * @param {NonNullTypeNode} typeNode - The NonNullTypeNode to process.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} schema - The current schema object.
 * @returns {JSONSchema} The updated JSON Schema.
 * @throws {Error} If the field type is disallowed for required fields without a default value.
 */
const handleNonNullType = (typeNode: NonNullTypeNode, ctx: TransformerContextProvider, schema: JSONSchema): JSONSchema => {
  const baseType = getBaseType(typeNode);
  if (isDisallowedScalarType(baseType)) {
    throw new Error(`
      Disallowed required field type ${baseType} without a default value.
      Use one of the supported scalar types for generation routes: [${supportedScalarTypes.join(', ')}]
    `);
  }
  return generateJSONSchemaFromTypeNode(typeNode.type, ctx, schema);
};

/**
 * Handles the conversion of a ListTypeNode to JSON Schema.
 * @param {ListTypeNode} typeNode - The ListTypeNode to process.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @returns {JSONSchema} The JSON Schema representing the list type.
 */
const handleListType = (typeNode: ListTypeNode, ctx: TransformerContextProvider): JSONSchema => {
  return {
    type: 'array',
    items: generateJSONSchemaFromTypeNode(typeNode.type, ctx),
  };
};

/**
 * Generates JSON Schema for a GraphQL type definition.
 * @param {TypeSystemDefinitionNode} def - The GraphQL type definition node.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} schema - The current schema object.
 * @returns {Record<string, JSONSchema>} A record of field names to their JSON Schema representations.
 * @throws {Error} If an unsupported type definition is encountered.
 */
const generateJSONSchemaForDef = (
  def: TypeSystemDefinitionNode,
  ctx: TransformerContextProvider,
  schema: JSONSchema,
): Record<string, JSONSchema> => {
  switch (def.kind) {
    case 'ObjectTypeDefinition':
      return handleObjectTypeDefinition(def, ctx, schema);
    case 'EnumTypeDefinition':
      return handleEnumTypeDefinition(def);
    default:
      throw new Error(`Unsupported type definition: ${def.kind}`);
  }
};

/**
 * Handles the conversion of an ObjectTypeDefinition to JSON Schema.
 * @param {ObjectTypeDefinitionNode} def - The ObjectTypeDefinition node to process.
 * @param {TransformerContextProvider} ctx - The transformer context.
 * @param {JSONSchema} schema - The current schema object.
 * @returns {Record<string, JSONSchema>} A record of field names to their JSON Schema representations.
 * @throws {Error} If the object type has no fields.
 */
const handleObjectTypeDefinition = (
  def: ObjectTypeDefinitionNode,
  ctx: TransformerContextProvider,
  schema: JSONSchema,
): Record<string, JSONSchema> => {
  const properties = def.fields?.reduce((acc: Record<string, JSONSchema>, field) => {
    acc[field.name.value] = generateJSONSchemaFromTypeNode(field.type, ctx, { type: '' });

    // Add required fields to the schema
    if (field.type.kind === Kind.NON_NULL_TYPE) {
      schema.required = [...(schema.required || []), field.name.value];
    }

    return acc;
  }, {});

  if (!properties) {
    throw new Error(`Object type ${def.name.value} has no fields`);
  }

  return properties;
};

/**
 * Handles the conversion of an EnumTypeDefinition to JSON Schema.
 * @param {EnumTypeDefinitionNode} def - The EnumTypeDefinition node to process.
 * @returns {Record<string, JSONSchema>} A record containing the enum name and its JSON Schema representation.
 */
const handleEnumTypeDefinition = (def: EnumTypeDefinitionNode): Record<string, JSONSchema> => {
  return {
    [def.name.value]: {
      type: 'string',
      enum: def.values?.map((value) => value.name.value),
    },
  };
};

/**
 * Processes a NamedTypeNode and returns the corresponding JSON Schema.
 * @param {NamedTypeNode} namedType - The NamedTypeNode to process.
 * @returns {JSONSchema} The JSON Schema representation of the named type.
 */
function processNamedType(namedType: NamedTypeNode): JSONSchema {
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
      return {
        type: 'object',
        properties: {},
        required: [],
      };
  }
}
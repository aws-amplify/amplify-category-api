import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Kind, NamedTypeNode, TypeNode, TypeSystemDefinitionNode } from 'graphql';
import { getBaseType, isScalar } from 'graphql-transformer-common';

export function generateJSONSchemaFromTypeNode(
  typeNode: TypeNode,
  ctx: TransformerContextProvider,
  schema: JSONSchema = { type: '' },
): JSONSchema {
  const generateJSONSchemaForDef = (def: TypeSystemDefinitionNode, schema: JSONSchema): Record<string, JSONSchema> => {
    if (def.kind === 'ObjectTypeDefinition') {
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
      return generateJSONSchemaFromTypeNode(typeNode.type, ctx, schema);
    case Kind.LIST_TYPE:
      return {
        type: 'array',
        items: generateJSONSchemaFromTypeNode(typeNode.type, ctx),
      };
  }
}

function processNamedType(namedType: NamedTypeNode, ctx: TransformerContextProvider): JSONSchema {
  // TODO: For AWSDate / AWSTime / AWSTimestamp, return a description detailing valid formats.
  switch (namedType.name.value) {
    case 'Int':
      return {
        type: 'number',
        description: 'A signed 32-bit integer value.',
      };
    case 'Float':
      return {
        type: 'number',
        description: 'An IEEE 754 floating point value.',
      };
    case 'String':
      return {
        type: 'string',
        description: 'A UTF-8 character sequence.',
      };
    case 'ID':
      return {
        type: 'string',
        description: "A unique identifier for an object. This scalar is serialized like a String but isn't meant to be human-readable.",
      };
    case 'Boolean':
      return { type: 'boolean' };
    case 'AWSJSON':
      return {
        type: 'string',
        description:
          'A JSON string. Any valid JSON construct is automatically parsed and loaded in the resolver code as maps, lists, or scalar values rather than as the literal input strings. Unquoted strings or otherwise invalid JSON result in a GraphQL validation error.',
      };
    case 'AWSEmail':
      return {
        type: 'string',
        description: 'An email address in the format local-part@domain-part as defined by RFC 822.',
      };
    case 'AWSDate':
      return {
        type: 'string',
        description: 'An extended ISO 8601 date string in the format YYYY-MM-DD.',
      };
    case 'AWSTime':
      return {
        type: 'string',
        description: 'An extended ISO 8601 time string in the format hh:mm:ss.sss.',
      };
    case 'AWSDateTime':
      return {
        type: 'string',
        description: 'An extended ISO 8601 date and time string in the format YYYY-MM-DDThh:mm:ss.sssZ.',
      };
    case 'AWSTimestamp':
      return {
        type: 'string',
        description: 'An integer value representing the number of seconds before or after 1970-01-01-T00:00Z.',
      };
    case 'AWSPhone':
      return {
        type: 'string',
        description:
          'A phone number. This value is stored as a string. Phone numbers can contain either spaces or hyphens to separate digit groups. Phone numbers without a country code are assumed to be US/North American numbers adhering to the North American Numbering Plan (NANP).',
      };
    case 'AWSURL':
      return {
        type: 'string',
        description:
          "A URL as defined by RFC 1738. For example, https://www.amazon.com/dp/B000NZW3KC/ or mailto:example@example.com. URLs must contain a schema (http, mailto) and can't contain two forward slashes (//) in the path part.",
      };
    case 'AWSIPAddress':
      return {
        type: 'string',
        description:
          'A valid IPv4 or IPv6 address. IPv4 addresses are expected in quad-dotted notation (123.12.34.56). IPv6 addresses are expected in non-bracketed, colon-separated format (1a2b:3c4b::1234:4567). You can include an optional CIDR suffix (123.45.67.89/16) to indicate subnet mask.',
      };
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

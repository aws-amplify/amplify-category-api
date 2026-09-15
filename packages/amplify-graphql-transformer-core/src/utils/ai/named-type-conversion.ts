import { NamedTypeNode } from 'graphql';
import { JSONSchema } from './json-schema';
import { GraphQLScalarJSONSchemaDefinition } from './graphql-scalar-json-schema-definitions';

/**
 * Processes a NamedTypeNode and returns the corresponding JSON Schema.
 * @param {NamedTypeNode} namedType - The NamedTypeNode to process.
 * @returns {JSONSchema} The JSON Schema representation of the named type.
 */
export const convertNamedTypeToJSONSchema = (namedType: NamedTypeNode): JSONSchema => {
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
};

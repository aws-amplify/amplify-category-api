import { TransformerContextProvider } from "@aws-amplify/graphql-transformer-interfaces";
import { InputValueDefinitionNode, Kind, NamedTypeNode, TypeNode } from "graphql";

export function convertInputValueToJSONSchema(node: InputValueDefinitionNode, ctx: TransformerContextProvider): JSONSchema {
  const schema: JSONSchema = {
    type: ''
  };
  const required: string[] = [];

  // Add description if available
  if (node.description) {
    schema.description = node.description.value;
  }

  // Recursively process the type
  const typeSchema = processType(node.type, node.name.value, required, ctx);
  Object.assign(schema, typeSchema);

  // Add required array if not empty
  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

function processType(typeNode: TypeNode, name: string, required: string[], ctx: TransformerContextProvider): JSONSchema {
  switch (typeNode.kind) {
    case Kind.NAMED_TYPE:
      const namedTypeSchema = processNamedType(typeNode, ctx);
      if (namedTypeSchema.type === 'object') {
        throw new Error(`Complex input types not yet supported (WIP). ${typeNode.name.value} is a complex type.`);
      }
      return namedTypeSchema;
    case Kind.NON_NULL_TYPE:
      required.push(name);
      return processType(typeNode.type, name, required, ctx);
    case Kind.LIST_TYPE:
      return {
        type: 'array',
        items: processType(typeNode.type, name, [], ctx)
      };
  }
}

function processNamedType(namedType: NamedTypeNode, ctx: TransformerContextProvider): JSONSchema {
  // TODO: For AWSDate / AWSTime / AWSTimestamp, return a description detailing valid formats.
  switch (namedType.name.value) {
    case 'Int':
    case 'Float':
      return { type: 'number' };
    case 'String':
    case 'ID':
      return { type: 'string' };
    case 'Boolean':
      return { type: 'boolean' };
    case 'AWSDate':
    case 'AWSTime':
    case 'AWSTimestamp':
    case 'AWSEmail':
    case 'AWSJSON':
      return { type: 'string' };
    default:
      // For custom object types
      return {
        type: 'object',
        properties: {},
        required: []
      };
  }
}

export type JSONLike =
| string
| number
| boolean
| null
| { [key: string]: JSONLike }
| JSONLike[];

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


import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FieldDefinitionNode } from 'graphql';
import { generateJSONSchemaFromTypeNode } from './graphql-json-schema-type';
import { JSONSchema } from '@aws-amplify/graphql-transformer-core';

export type Tool = {
  toolSpec: ToolSpec;
};

export type Tools = {
  tools: Tool[];
};

export type ToolConfig = {
  tools: Tool[];
  toolChoice: {
    tool: {
      name: string;
    };
  };
};

type ToolSpec = {
  name: string;
  description: string;
  inputSchema: {
    json: JSONSchema;
  };
};

/**
 * Creates a tool configuration for generating a response type based on a GraphQL field definition.
 *
 * This function generates a JSON schema from the field's type and wraps it in a tool specification.
 * The tool can be used by AI models to generate responses that conform to the field's type structure.
 *
 * @param {FieldDefinitionNode} field - The GraphQL field definition node for which to create the response type tool.
 * @param {TransformerContextProvider} ctx - The transformer context provider, which supplies necessary context for schema generation.
 * @returns {ToolConfig} A tool configuration object containing:
 *   - tools: An array with a single tool specification for the response type.
 *   - toolChoice: An object specifying the name of the tool to be used.
 *
 * The returned tool configuration can be used with AI models that support tool-based interactions,
 * ensuring that generated responses match the expected structure of the GraphQL field.
 */
export const createResponseTypeTool = (field: FieldDefinitionNode, ctx: TransformerContextProvider): ToolConfig => {
  const { type } = field;
  const schema = generateJSONSchemaFromTypeNode(type, ctx);

  // We box the schema to support scalar return types.
  // Bedrock only supports object types in tool definitions.
  const boxedSchema = {
    type: 'object',
    properties: {
      value: schema,
    },
    required: ['value'],
  };

  const description =
    'Generate a response type for the given field. Use well-structured JSON. JSON.parse(value) will be used to parse the response.';
  const tools: Tool[] = [
    {
      toolSpec: {
        name: 'responseType',
        description,
        inputSchema: {
          json: boxedSchema,
        },
      },
    },
  ];
  const toolChoice = { tool: { name: 'responseType' } };
  const toolConfig = { tools, toolChoice };

  return toolConfig;
};

import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FieldDefinitionNode } from 'graphql';
import { JSONSchema, generateJSONSchemaFromTypeNode } from './graphql-json-schema-type';

export type ToolDefinition = {
  name: string;
  description: string;
};

export type Tools = {
  tools: Tool[];
};

export type Tool = {
  toolSpec: ToolSpec;
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

export const createResponseTypeTool = (field: FieldDefinitionNode, ctx: TransformerContextProvider): ToolConfig => {
  const { type } = field;
  const schema = generateJSONSchemaFromTypeNode(type, ctx);
  const boxedSchema = {
    type: 'object',
    properties: {
      value: schema,
    },
    required: ['value'],
  };
  const tools: Tool[] = [
    {
      toolSpec: {
        name: 'responseType',
        description: 'Generate a response type for the given field',
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

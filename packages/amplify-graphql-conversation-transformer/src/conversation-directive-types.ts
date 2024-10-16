import { DataSourceProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, FieldDefinitionNode, InputObjectTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { MessageModel } from './graphql-types/message-model';
import { ConversationModel } from './graphql-types/session-model';
import { Tool } from './utils/tools';

/**
 * Configuration for the Conversation Directive
 */
export type ConversationDirectiveConfiguration = {
  // From the GraphQL Schema
  parent: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
  directive: DirectiveNode;

  // Raw Directive Input
  aiModel: string;
  functionName: string | undefined;
  systemPrompt: string;
  inferenceConfiguration: ConversationInferenceConfiguration;
  tools: ToolDefinition[];

  // Generated within the Conversation Transformer
  toolSpec: { tools: Tool[] } | undefined;
  conversationModel: ConversationModel;
  messageModel: MessageModel;
  assistantResponseMutation: { field: FieldDefinitionNode; input: InputObjectTypeDefinitionNode };
  assistantResponseSubscriptionField: FieldDefinitionNode;
  dataSources: {
    conversationTable: DataSourceProvider;
    messageTable: DataSourceProvider;
    lambdaFunction: DataSourceProvider;
  };
};

/**
 * Conversation Inference Configuration
 */
export type ConversationInferenceConfiguration = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
};

export type ToolDefinition = {
  name: string;
  description: string;
};

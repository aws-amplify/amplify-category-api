import { DataSourceProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, FieldDefinitionNode, InputObjectTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { MessageModel } from './graphql-types/message-model';
import { ConversationModel } from './graphql-types/conversation-model';
import { Tool } from './utils/tools';

export const LIST_MESSAGES_INDEX_NAME = 'gsi-ConversationMessage.conversationId.createdAt';

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
  systemPrompt: string;
  inferenceConfiguration: ConversationInferenceConfiguration | undefined;
  tools: ToolDefinition[];
  functionName: string | undefined;
  handler: ConversationHandlerFunctionConfiguration | undefined;

  // Generated within the Conversation Transformer
  toolSpec: Tool[] | undefined;
  conversation: ConversationModel;
  message: MessageModel;
  assistantResponseMutation: { field: FieldDefinitionNode; input: InputObjectTypeDefinitionNode };
  assistantResponseSubscriptionField: FieldDefinitionNode;
  dataSources: {
    conversationTable: DataSourceProvider;
    messageTable: DataSourceProvider;
    lambdaFunction: DataSourceProvider;
  };
};

/**
 * Conversation Handler Function Configuration
 */
export type ConversationHandlerFunctionConfiguration = {
  functionName: string;
  eventVersion: string;
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

import { DataSourceProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, FieldDefinitionNode, InputObjectTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ConversationModel } from './graphql-types/conversation-model';
import { MessageModel } from './graphql-types/message-model';
import { Tool } from './tools/process-tools';

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
  /**
   * Custom handler function name.
   *
   * @deprecated Replaced by 'handler'
   */
  functionName: string | undefined;
  handler: ConversationHandlerFunctionConfiguration | undefined;

  // Generated within the Conversation Transformer
  toolSpec: Tool[] | undefined;
  conversation: ConversationModel;
  message: MessageModel;
  assistantResponseMutation: { field: FieldDefinitionNode; input: InputObjectTypeDefinitionNode };
  assistantResponseStreamingMutation: { field: FieldDefinitionNode; input: InputObjectTypeDefinitionNode };
  assistantResponseSubscriptionField: FieldDefinitionNode;
  dataSources: ConversationDirectiveDataSources;
};

/**
 * Conversation Directive Handler Function Configuration
 */
export type ConversationHandlerFunctionConfiguration = {
  functionName: string;
  eventVersion: string;
};

/**
 * Conversation Directive Inference Configuration
 */
export type ConversationInferenceConfiguration = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
};

/**
 * Conversation Directive Tool Definition
 */
export type ToolDefinition = {
  name: string;
  description: string;
};

/**
 * Conversation Directive Data Sources
 */
export type ConversationDirectiveDataSources = {
  lambdaFunctionDataSource: DataSourceProvider;
  messageTableDataSource: DataSourceProvider;
  conversationTableDataSource: DataSourceProvider;
};

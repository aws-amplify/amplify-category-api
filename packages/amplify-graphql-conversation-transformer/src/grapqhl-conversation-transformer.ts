import { ConversationDirective } from '@aws-amplify/graphql-directives';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { InvalidDirectiveError, TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerAuthProvider,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ConversationModel } from './graphql-types/session-model';
import { MessageModel } from './graphql-types/message-model';
import { type ToolDefinition, type Tools } from './utils/tools';
import { ConversationPrepareHandler } from './transformer-steps/conversation-prepare-handler';
import { ConversationResolverGenerator } from './transformer-steps/conversation-resolver-generator';
import { ConversationFieldHandler } from './transformer-steps/conversation-field-handler';
import * as lambda from 'aws-cdk-lib/aws-lambda';

/**
 * Configuration for the Conversation Directive
 */
export type ConversationDirectiveConfiguration = {
  parent: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  aiModel: string;
  /**
   * Custom handler function name.
   *
   * @deprecated Replaced by 'handler'
   */
  functionName: string | undefined;
  handler: ConversationHandlerFunctionConfiguration | undefined;
  field: FieldDefinitionNode;
  responseMutationInputTypeName: string;
  responseMutationName: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  toolSpec: Tools;
  conversationModel: ConversationModel;
  messageModel: MessageModel;
  inferenceConfiguration: ConversationInferenceConfiguration;
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

/**
 * Transformer for handling `@conversation` directives in GraphQL schemas
 */
export class ConversationTransformer extends TransformerPluginBase {
  private directives: ConversationDirectiveConfiguration[] = [];
  private fieldHandler: ConversationFieldHandler;
  private prepareHandler: ConversationPrepareHandler;
  private resolverGenerator: ConversationResolverGenerator;

  constructor(
    modelTransformer: ModelTransformer,
    hasManyTransformer: HasManyTransformer,
    belongsToTransformer: BelongsToTransformer,
    authProvider: TransformerAuthProvider,
    functionNameMap?: Record<string, lambda.IFunction>,
  ) {
    super('amplify-conversation-transformer', ConversationDirective.definition);
    this.fieldHandler = new ConversationFieldHandler();
    this.prepareHandler = new ConversationPrepareHandler(modelTransformer, hasManyTransformer, belongsToTransformer, authProvider);
    this.resolverGenerator = new ConversationResolverGenerator(functionNameMap);
  }

  /**
   * Processes a field with the @conversation directive
   * @param parent - The parent object type definition
   * @param definition - The field definition
   * @param directive - The directive node
   * @param context - The transformer context
   */
  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveConfg = this.fieldHandler.getDirectiveConfig(parent, definition, directive, context);
    this.directives.push(directiveConfg);
  };

  /**
   * Generates resolvers for the conversation directive
   * @param ctx - The transformer context provider
   */
  generateResolvers = (ctx: TransformerContextProvider): void => {
    this.resolverGenerator.generateResolvers(this.directives, ctx);
  };

  /**
   * Prepares resources for the conversation directive
   * @param ctx - The transformer prepare step context provider
   */
  prepare = (ctx: TransformerPrepareStepContextProvider): void => {
    this.prepareHandler.prepare(ctx, this.directives);
  };
}

const validate = (config: ConversationDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field } = config;
  if (field.type.kind !== 'NamedType' || field.type.name.value !== 'ConversationMessage') {
    throw new InvalidDirectiveError('@conversation return type must be ConversationMessage');
  }
};

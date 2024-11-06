import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, InvalidTransformerError } from '@aws-amplify/graphql-transformer-core';
import { ConversationDirectiveConfiguration, conversationSupportTypes } from '../conversation-directive-configuration';
import { constructStreamResponseType, createConversationTurnErrorInput } from '../graphql-types/message-model';
import { TransformerAuthProvider, TransformerPrepareStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';

/**
 * @class ConversationPrepareHandler
 * @description Handles the preparation of conversation resources in the GraphQL schema.
 * This class is responsible for setting up the necessary data models, relationships, and authentication for conversations and messages.
 */
export class ConversationPrepareHandler {
  private modelTransformer: ModelTransformer;
  private hasManyTransformer: HasManyTransformer;
  private belongsToTransformer: BelongsToTransformer;
  private authProvider: TransformerAuthProvider;

  /**
   * @constructor
   * @param {ModelTransformer} modelTransformer - The model transformer instance.
   * @param {HasManyTransformer} hasManyTransformer - The has many transformer instance.
   * @param {BelongsToTransformer} belongsToTransformer - The belongs to transformer instance.
   * @param {TransformerAuthProvider} authProvider - The authentication provider instance.
   */
  constructor(
    modelTransformer: ModelTransformer,
    hasManyTransformer: HasManyTransformer,
    belongsToTransformer: BelongsToTransformer,
    authProvider: TransformerAuthProvider,
  ) {
    this.modelTransformer = modelTransformer;
    this.hasManyTransformer = hasManyTransformer;
    this.belongsToTransformer = belongsToTransformer;
    this.authProvider = authProvider;
  }

  /**
   * Prepares resources for the conversation directive.
   *
   * This method iterates through all conversation directives and prepares
   * the necessary resources for each one. It sets up the data models,
   * relationships, and authentication for conversations and messages.
   *
   * @param {TransformerPrepareStepContextProvider} ctx - The transformer prepare step context provider.
   * @param {ConversationDirectiveConfiguration[]} directives - An array of conversation directive configurations.
   * @throws {InvalidTransformerError} If there's an issue with the transformer configuration.
   */
  prepare(ctx: TransformerPrepareStepContextProvider, directives: ConversationDirectiveConfiguration[]): void {
    // add once per schema
    conversationSupportTypes.forEach((type) => ctx.output.addType(type));
    const conversationTurnErrorInput = createConversationTurnErrorInput();
    ctx.output.addInput(conversationTurnErrorInput);

    for (const directive of directives) {
      this.prepareResourcesForDirective(directive, ctx);
    }
  }

  /**
   * Prepares resources for a specific conversation directive.
   *
   * This method sets up the necessary data models, relationships, and authentication
   * for both the conversation and message models associated with the directive.
   * It also registers data source providers, adds fields to the schema, and configures
   * the authentication for the models.
   *
   * @param {ConversationDirectiveConfiguration} directive - The conversation directive configuration.
   * @param {TransformerPrepareStepContextProvider} ctx - The transformer prepare step context provider.
   * @throws {InvalidTransformerError} If no authentication provider is found.
   */
  private prepareResourcesForDirective(directive: ConversationDirectiveConfiguration, ctx: TransformerPrepareStepContextProvider): void {
    // TODO: Add @aws_cognito_user_pools directive to send messages mutation
    const { conversation, message, assistantResponseMutation, assistantResponseStreamingMutation, assistantResponseSubscriptionField } =
      directive;

    // Extract model names for later use
    const conversationName = conversation.model.name.value;
    const messageName = message.model.name.value;

    // Add necessary inputs, fields, and objects to the output schema
    ctx.output.addInput(assistantResponseMutation.input);
    ctx.output.addInput(assistantResponseStreamingMutation.input);
    ctx.output.addMutationFields([assistantResponseMutation.field, assistantResponseStreamingMutation.field]);
    ctx.output.addSubscriptionFields([assistantResponseSubscriptionField]);
    ctx.output.addObject(conversation.model);
    ctx.output.addObject(message.model);

    // Register data source providers for both models
    ctx.providerRegistry.registerDataSourceProvider(conversation.model, this.modelTransformer);
    ctx.providerRegistry.registerDataSourceProvider(message.model, this.modelTransformer);

    // Set data source strategies for both models
    ctx.dataSourceStrategies[conversationName] = DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;
    ctx.dataSourceStrategies[messageName] = DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;

    // Apply model transformations
    this.modelTransformer.object(conversation.model, conversation.modelDirective, ctx);
    this.modelTransformer.object(message.model, message.modelDirective, ctx);

    // Execute the 'before' hook of the model transformer
    // This is crucial for adding the iterative_table_generator in the model transformer
    // Without this, a schema without an Amplify managed table datasource strategy would result in an error
    this.modelTransformer.before(ctx);

    // Set up relationships between conversation and message models
    this.belongsToTransformer.field(message.model, message.conversationField, message.belongsToConversationDirective, ctx);
    this.hasManyTransformer.field(conversation.model, conversation.messagesField, conversation.hasManyMessagesDirective, ctx);

    // Ensure an authentication provider exists and apply it to both models
    if (!this.authProvider.object) {
      throw new InvalidTransformerError('No authentication provider found.');
    }
    this.authProvider.object(conversation.model, conversation.authDirective, ctx);
    this.authProvider.object(message.model, message.authDirective, ctx);
  }
}

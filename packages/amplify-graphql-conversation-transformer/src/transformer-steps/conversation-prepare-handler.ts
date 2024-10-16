import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, InvalidTransformerError } from '@aws-amplify/graphql-transformer-core';
import { TransformerAuthProvider, TransformerPrepareStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';

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

    // Destructure conversation model configuration
    const {
      conversationAuthDirective,
      conversationModelDirective,
      conversationHasManyMessagesDirective,
      conversationMessagesField,
      conversationModel,
    } = directive.conversationModel;

    // Destructure message model configuration
    const {
      messageAuthDirective,
      messageModelDirective,
      messageBelongsToConversationDirective,
      messageConversationField,
      messageModel,
      messageSubscription,
      assistantMutationField,
      assistantMutationInput,
    } = directive.messageModel;

    // Extract model names for later use
    const sessionModelName = conversationModel.name.value;
    const messageModelName = messageModel.name.value;

    // Add necessary inputs, fields, and objects to the output schema
    ctx.output.addInput(assistantMutationInput);
    ctx.output.addMutationFields([assistantMutationField]);
    ctx.output.addSubscriptionFields([messageSubscription]);
    ctx.output.addObject(conversationModel);
    ctx.output.addObject(messageModel);

    // Register data source providers for both models
    ctx.providerRegistry.registerDataSourceProvider(conversationModel, this.modelTransformer);
    ctx.providerRegistry.registerDataSourceProvider(messageModel, this.modelTransformer);

    // Set data source strategies for both models
    ctx.dataSourceStrategies[sessionModelName] = DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;
    ctx.dataSourceStrategies[messageModelName] = DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;

    // Apply model transformations
    this.modelTransformer.object(conversationModel, conversationModelDirective, ctx);
    this.modelTransformer.object(messageModel, messageModelDirective, ctx);

    // Execute the 'before' hook of the model transformer
    // This is crucial for adding the iterative_table_generator in the model transformer
    // Without this, a schema without an Amplify managed table datasource strategy would result in an error
    this.modelTransformer.before(ctx);

    // Set up relationships between conversation and message models
    this.belongsToTransformer.field(messageModel, messageConversationField, messageBelongsToConversationDirective, ctx);
    this.hasManyTransformer.field(conversationModel, conversationMessagesField, conversationHasManyMessagesDirective, ctx);

    // Ensure an authentication provider exists and apply it to both models
    if (!this.authProvider.object) {
      throw new InvalidTransformerError('No authentication provider found.');
    }
    this.authProvider.object(conversationModel, conversationAuthDirective, ctx);
    this.authProvider.object(messageModel, messageAuthDirective, ctx);
  }
}

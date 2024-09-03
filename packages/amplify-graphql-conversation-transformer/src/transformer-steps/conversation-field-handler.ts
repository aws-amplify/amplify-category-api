import { DirectiveWrapper, InvalidDirectiveError, generateGetArgumentsInput } from '@aws-amplify/graphql-transformer-core';
import { TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { toUpper } from 'graphql-transformer-common';
import { ConversationDirectiveConfiguration } from '../grapqhl-conversation-transformer';
import { createConversationModel } from '../graphql-types/session-model';
import { createMessageModel } from '../graphql-types/message-model';

/**
 * @class ConversationFieldHandler
 * @description Handles the processing and configuration of conversation fields in GraphQL schemas.
 * This class is responsible for validating, configuring, and creating models for conversation-related directives.
 */
export class ConversationFieldHandler {
  /**
   * @method getDirectiveConfig
   * @description Retrieves and processes the configuration for a conversation directive.
   * @param {ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode} parent - The parent node of the field.
   * @param {FieldDefinitionNode} definition - The field definition node.
   * @param {DirectiveNode} directive - The directive node.
   * @param {TransformerSchemaVisitStepContextProvider} context - The context provider for the transformer schema visit step.
   * @returns {ConversationDirectiveConfiguration} The processed configuration for the conversation directive.
   * @throws {InvalidDirectiveError} If the directive is not used correctly.
   */
  getDirectiveConfig(
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): ConversationDirectiveConfiguration {
    if (parent.name.value !== 'Mutation') {
      throw new InvalidDirectiveError('@conversation directive must be used on Mutation field.');
    }
    const config = this.getConversationConfig(directive, parent, definition, context);
    const { messageModel, conversationModel } = this.createModels(config, definition);
    config.messageModel = messageModel;
    config.conversationModel = conversationModel;
    config.responseMutationInputTypeName = messageModel.assistantMutationInput.name.value;
    config.responseMutationName = messageModel.assistantMutationField.name.value;
    this.validate(config);
    return config;
  }

  /**
   * @method getConversationConfig
   * @private
   * @description Retrieves the conversation configuration from the directive.
   * @param {DirectiveNode} directive - The directive node.
   * @param {ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode} parent - The parent node of the field.
   * @param {FieldDefinitionNode} definition - The field definition node.
   * @param {TransformerSchemaVisitStepContextProvider} context - The context provider for the transformer schema visit step.
   * @returns {ConversationDirectiveConfiguration} The conversation configuration.
   */
  private getConversationConfig(
    directive: DirectiveNode,
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): ConversationDirectiveConfiguration {
    const directiveWrapped = new DirectiveWrapper(directive);
    const config = directiveWrapped.getArguments(
      {
        parent,
        directive,
        field: definition,
        inferenceConfiguration: {},
      } as ConversationDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    return config;
  }

  /**
   * @method createModels
   * @private
   * @description Creates message and conversation models based on the provided configuration.
   * @param {ConversationDirectiveConfiguration} config - The conversation directive configuration.
   * @param {FieldDefinitionNode} definition - The field definition node.
   * @returns {{ messageModel: any; conversationModel: any }} An object containing the created message and conversation models.
   * @throws {InvalidDirectiveError} If the return type of the field is not 'ConversationMessage'.
   */
  private createModels(
    config: ConversationDirectiveConfiguration,
    definition: FieldDefinitionNode,
  ): { messageModel: any; conversationModel: any } {
    if (definition.type.kind !== 'NamedType' || definition.type.name.value !== 'ConversationMessage') {
      throw new InvalidDirectiveError('@conversation return type must be ConversationMessage');
    }

    const capitalizedFieldName = toUpper(config.field.name.value);
    const messageModelName = `ConversationMessage${capitalizedFieldName}`;
    const conversationModelName = `Conversation${capitalizedFieldName}`;
    const referenceFieldName = 'conversationId';

    const messageModel = createMessageModel(
      conversationModelName,
      messageModelName,
      referenceFieldName,
      capitalizedFieldName,
      definition.type,
    );
    const conversationModel = createConversationModel(conversationModelName, messageModelName, referenceFieldName);
    return { messageModel, conversationModel };
  }

  /**
   * Validates the conversation directive configuration.
   * @param {ConversationDirectiveConfiguration} config - The conversation directive configuration to validate.
   * @throws {InvalidDirectiveError} If the configuration is invalid.
   */
  private validate(config: ConversationDirectiveConfiguration): void {
    this.validateReturnType(config);
    this.validateInferenceConfig(config);
  }

  /**
   * Validates the return type of the mutation on which the the conversation directive is defined.
   * @param {ConversationDirectiveConfiguration} config - The conversation directive configuration to validate.
   * @throws {InvalidDirectiveError} If the return type of the mutation is not ConversationMessage.
   */
  private validateReturnType(config: ConversationDirectiveConfiguration): void {
    // TODO: validate that the other supporting types are present.
    const { field } = config;
    if (field.type.kind !== 'NamedType' || field.type.name.value !== 'ConversationMessage') {
      throw new InvalidDirectiveError('@conversation return type must be ConversationMessage');
    }
  }

  /**
   * Validates the inference configuration for the `@conversation` directive according to the Bedrock API docs.
   * {@link https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InferenceConfiguration.html}
   * @param config The conversation directive configuration to validate.
   */
  private validateInferenceConfig(config: ConversationDirectiveConfiguration): void {
    const { maxTokens, temperature, topP } = config.inferenceConfiguration;

    // dealing with possible 0 values, so we check for undefined.
    if (maxTokens !== undefined && maxTokens < 1) {
      throw new InvalidDirectiveError(`@conversation directive maxTokens valid range: Minimum value of 1. Provided: ${maxTokens}`);
    }

    if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
      throw new InvalidDirectiveError(
        `@conversation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: ${temperature}`,
      );
    }

    if (topP !== undefined && (topP < 0 || topP > 1)) {
      throw new InvalidDirectiveError(
        `@conversation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: ${topP}`,
      );
    }
  }
}

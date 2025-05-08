import { DirectiveWrapper, generateGetArgumentsInput, InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  DirectiveNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
} from 'graphql';
import * as semver from 'semver';
import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';
import { ConversationModel, createConversationModel } from '../graphql-types/conversation-model';
import {
  createAssistantMutationField,
  createAssistantResponseMutationInput,
  createAssistantResponseStreamingMutationInput,
  createAssistantStreamingMutationField,
  createAttachmentUploadUrlQueryField,
  createAttachmentUploadUrlQueryInput,
  createMessageModel,
  createMessageSubscription,
  MessageModel,
} from '../graphql-types/message-model';
import {
  CONVERSATION_MESSAGES_REFERENCE_FIELD_NAME,
  getAssistantMutationFieldName,
  getAssistantStreamingMutationFieldName,
  getAttachmentUploadUrlQueryFieldName,
  getConversationMessageTypeName,
  getConversationTypeName,
  getMessageSubscriptionFieldName,
} from '../graphql-types/name-values';
import { isCustomQueryToolPredicate, isModelOperationToolPredicate } from '../tools/process-tools';

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
    const parsedConfig = this.getConversationConfig(directive, parent, definition, context);
    const conversationModels = this.createModels(parsedConfig, definition);
    const supportingFields = this.createSupportingFields(parsedConfig);
    const config = {
      ...parsedConfig,
      ...conversationModels,
      ...supportingFields,
    };
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
   * @returns {{ message: MessageModel; conversation: ConversationModel }} An object containing the created message and conversation models.
   * @throws {InvalidDirectiveError} If the return type of the field is not 'ConversationMessage'.
   */
  private createModels(
    config: ConversationDirectiveConfiguration,
    definition: FieldDefinitionNode,
  ): { message: MessageModel; conversation: ConversationModel } {
    if (definition.type.kind !== 'NamedType' || definition.type.name.value !== 'AmplifyAIConversationMessage') {
      throw new InvalidDirectiveError('@conversation return type must be AmplifyAIConversationMessage');
    }

    const conversationMessageTypeName = getConversationMessageTypeName(config);
    const conversationTypeName = getConversationTypeName(config);

    const message = createMessageModel(
      conversationTypeName,
      conversationMessageTypeName,
      CONVERSATION_MESSAGES_REFERENCE_FIELD_NAME,
      definition.type,
    );
    const conversation = createConversationModel(
      conversationTypeName,
      conversationMessageTypeName,
      CONVERSATION_MESSAGES_REFERENCE_FIELD_NAME,
    );
    return { message, conversation };
  }

  private createSupportingFields(config: ConversationDirectiveConfiguration): {
    assistantResponseMutation: { field: FieldDefinitionNode; input: InputObjectTypeDefinitionNode };
    assistantResponseStreamingMutation: { field: FieldDefinitionNode; input: InputObjectTypeDefinitionNode };
    assistantResponseSubscriptionField: FieldDefinitionNode;
    attachmentUploadUrlQuery: { field: FieldDefinitionNode; input: InputObjectTypeDefinitionNode };
  } {
    const conversationMessageTypeName = getConversationMessageTypeName(config);
    const messageSubscriptionFieldName = getMessageSubscriptionFieldName(config);
    const assistantMutationFieldName = getAssistantMutationFieldName(config);
    const assistantStreamingMutationFieldName = getAssistantStreamingMutationFieldName(config);
    const attachmentUploadUrlQueryFieldName = getAttachmentUploadUrlQueryFieldName(config);

    const assistantResponseSubscriptionField = createMessageSubscription(messageSubscriptionFieldName, assistantStreamingMutationFieldName);

    const assistantResponseMutationInput = createAssistantResponseMutationInput(conversationMessageTypeName);
    const assistantResponseMutationField = createAssistantMutationField(
      assistantMutationFieldName,
      conversationMessageTypeName,
      assistantResponseMutationInput.name.value,
    );

    const assistantResponseStreamingMutationInput = createAssistantResponseStreamingMutationInput(conversationMessageTypeName);
    const assistantResponseStreamingMutationField = createAssistantStreamingMutationField(
      assistantStreamingMutationFieldName,
      assistantResponseStreamingMutationInput.name.value,
    );

    const attachmentUploadUrlQueryInput = createAttachmentUploadUrlQueryInput(conversationMessageTypeName);
    const attachmentUploadUrlQueryField = createAttachmentUploadUrlQueryField(
      attachmentUploadUrlQueryFieldName,
      attachmentUploadUrlQueryInput.name.value
    );

    return {
      assistantResponseMutation: { field: assistantResponseMutationField, input: assistantResponseMutationInput },
      assistantResponseStreamingMutation: {
        field: assistantResponseStreamingMutationField,
        input: assistantResponseStreamingMutationInput,
      },
      assistantResponseSubscriptionField,
      attachmentUploadUrlQuery: {
        field: attachmentUploadUrlQueryField,
        input: attachmentUploadUrlQueryInput
      },
    };
  }

  /**
   * Validates the conversation directive configuration.
   * @param {ConversationDirectiveConfiguration} config - The conversation directive configuration to validate.
   * @throws {InvalidDirectiveError} If the configuration is invalid.
   */
  private validate(config: ConversationDirectiveConfiguration): void {
    this.validateReturnType(config);
    this.validateInferenceConfig(config);
    this.validateHandler(config);
    this.validateToolDefinitions(config);
  }

  private validateToolDefinitions(config: ConversationDirectiveConfiguration): void {
    const { tools } = config;
    if (!tools) return;

    const isValidToolName = (name: string): boolean => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) && name.length >= 1 && name.length <= 64;

    for (const tool of tools) {
      // https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ToolSpecification.html
      // Pattern: ^[a-zA-Z][a-zA-Z0-9_]*$
      // Length Constraints: Minimum length of 1. Maximum length of 64.
      if (!isValidToolName(tool.name)) {
        throw new InvalidDirectiveError(
          `Tool name must be between 1 and 64 characters, start with a letter, and contain only letters, numbers, and underscores. Found: ${tool.name}`,
        );
      }
    }

    const invalidToolNames = tools
      .filter((tool) => !isModelOperationToolPredicate(tool) && !isCustomQueryToolPredicate(tool))
      .map((tool) => tool.name);

    if (invalidToolNames.length > 0) {
      throw new InvalidDirectiveError(
        `Tool definitions must contain a modelName and modelOperation, or queryName. Invalid tools: ${invalidToolNames.join(', ')}`,
      );
    }
  }

  /**
   * Validates the handler configuration for the conversation directive.
   * @param {ConversationDirectiveConfiguration} config - The conversation directive configuration to validate.
   * @throws {InvalidDirectiveError} If the configuration is invalid.
   */
  private validateHandler(config: ConversationDirectiveConfiguration): void {
    if (config.handler && config.functionName) {
      throw new InvalidDirectiveError("'functionName' and 'handler' are mutually exclusive");
    }
    if (config.handler) {
      const eventVersion = semver.coerce(config.handler.eventVersion);
      if (eventVersion?.major !== 1) {
        throw new InvalidDirectiveError(
          `Unsupported custom conversation handler. Expected eventVersion to match 1.x, received ${config.handler.eventVersion}`,
        );
      }
    }
  }

  /**
   * Validates the return type of the mutation on which the the conversation directive is defined.
   * @param {ConversationDirectiveConfiguration} config - The conversation directive configuration to validate.
   * @throws {InvalidDirectiveError} If the return type of the mutation is not ConversationMessage.
   */
  private validateReturnType(config: ConversationDirectiveConfiguration): void {
    // TODO: validate that the other supporting types are present.
    const { field } = config;
    if (field.type.kind !== 'NamedType' || field.type.name.value !== 'AmplifyAIConversationMessage') {
      throw new InvalidDirectiveError('@conversation return type must be AmplifyAIConversationMessage');
    }
  }

  /**
   * Validates the inference configuration for the `@conversation` directive according to the Bedrock API docs.
   * {@link https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InferenceConfiguration.html}
   * @param config The conversation directive configuration to validate.
   */
  private validateInferenceConfig(config: ConversationDirectiveConfiguration): void {
    if (!config.inferenceConfiguration) return;
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

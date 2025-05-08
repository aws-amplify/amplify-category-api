import { toUpper } from 'graphql-transformer-common';
import pluralize from 'pluralize';
import { ConversationDirectiveConfiguration } from '../conversation-directive-configuration';

export const CONVERSATION_MESSAGES_REFERENCE_FIELD_NAME = 'conversationId';
export const LIST_MESSAGES_INDEX_NAME = 'gsi-ConversationMessage.conversationId.createdAt';
export const LIST_CONVERSATIONS_INDEX_NAME = 'gsi-Conversation.typename.updatedAt';
export const CONVERSATION_MESSAGE_GET_QUERY_INPUT_TYPE_NAME = 'ID';

export const getConversationTypeName = (config: ConversationDirectiveConfiguration) =>
  `Conversation${upperCaseConversationFieldName(config)}`;

export const getConversationMessageTypeName = (config: ConversationDirectiveConfiguration) =>
  `ConversationMessage${upperCaseConversationFieldName(config)}`;

export const getMessageSubscriptionFieldName = (config: ConversationDirectiveConfiguration) =>
  `onCreateAssistantResponse${upperCaseConversationFieldName(config)}`;

export const getAssistantMutationFieldName = (config: ConversationDirectiveConfiguration) =>
  `createAssistantResponse${upperCaseConversationFieldName(config)}`;

export const getAssistantStreamingMutationFieldName = (config: ConversationDirectiveConfiguration) =>
  `createAssistantResponseStream${upperCaseConversationFieldName(config)}`;

export const getAttachmentUploadUrlQueryFieldName = (config: ConversationDirectiveConfiguration) =>
  `getAttachmentUploadUrl${upperCaseConversationFieldName(config)}`;

export const getFunctionStackName = (config: ConversationDirectiveConfiguration) =>
  `${upperCaseConversationFieldName(config)}ConversationDirectiveLambdaStack`;

export const getConversationMessageGetQueryName = (config: ConversationDirectiveConfiguration) =>
  `getConversationMessage${upperCaseConversationFieldName(config)}`;

export const getConversationMessageListQueryName = (config: ConversationDirectiveConfiguration) =>
  `listConversationMessage${pluralize(upperCaseConversationFieldName(config))}`;

export const getConversationMessageListQueryInputTypeName = (config: ConversationDirectiveConfiguration) =>
  `ModelConversationMessage${upperCaseConversationFieldName(config)}FilterInput`;

export const upperCaseConversationFieldName = (config: ConversationDirectiveConfiguration) => toUpper(config.field.name.value);

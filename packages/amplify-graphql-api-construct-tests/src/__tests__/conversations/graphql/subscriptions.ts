/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateAssistantResponsePirateChat = /* GraphQL */ `subscription OnCreateAssistantResponsePirateChat($conversationId: ID) {
  onCreateAssistantResponsePirateChat(conversationId: $conversationId) {
    aiContext
    associatedUserMessageId
    content {
      text
      __typename
    }
    conversation {
      createdAt
      id
      metadata
      name
      owner
      updatedAt
      __typename
    }
    conversationId
    createdAt
    id
    owner
    role
    toolConfiguration {
      __typename
    }
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateAssistantResponsePirateChatSubscriptionVariables,
  APITypes.OnCreateAssistantResponsePirateChatSubscription
>;
export const onCreateConversationMessagePirateChat = /* GraphQL */ `subscription OnCreateConversationMessagePirateChat(
  $filter: ModelSubscriptionConversationMessagePirateChatFilterInput
  $owner: String
) {
  onCreateConversationMessagePirateChat(filter: $filter, owner: $owner) {
    aiContext
    associatedUserMessageId
    content {
      text
      __typename
    }
    conversation {
      createdAt
      id
      metadata
      name
      owner
      updatedAt
      __typename
    }
    conversationId
    createdAt
    id
    owner
    role
    toolConfiguration {
      __typename
    }
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateConversationMessagePirateChatSubscriptionVariables,
  APITypes.OnCreateConversationMessagePirateChatSubscription
>;

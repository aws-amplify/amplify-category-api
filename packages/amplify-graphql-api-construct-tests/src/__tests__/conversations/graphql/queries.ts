/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getConversationMessagePirateChat = /* GraphQL */ `query GetConversationMessagePirateChat($id: ID!) {
  getConversationMessagePirateChat(id: $id) {
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
` as GeneratedQuery<APITypes.GetConversationMessagePirateChatQueryVariables, APITypes.GetConversationMessagePirateChatQuery>;
export const getConversationPirateChat = /* GraphQL */ `query GetConversationPirateChat($id: ID!) {
  getConversationPirateChat(id: $id) {
    createdAt
    id
    messages {
      nextToken
      __typename
    }
    metadata
    name
    owner
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetConversationPirateChatQueryVariables, APITypes.GetConversationPirateChatQuery>;
export const listConversationMessagePirateChats = /* GraphQL */ `query ListConversationMessagePirateChats(
  $filter: ModelConversationMessagePirateChatFilterInput
  $limit: Int
  $nextToken: String
) {
  listConversationMessagePirateChats(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      aiContext
      associatedUserMessageId
      conversationId
      createdAt
      id
      owner
      role
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListConversationMessagePirateChatsQueryVariables, APITypes.ListConversationMessagePirateChatsQuery>;
export const listConversationPirateChats = /* GraphQL */ `query ListConversationPirateChats(
  $filter: ModelConversationPirateChatFilterInput
  $limit: Int
  $nextToken: String
) {
  listConversationPirateChats(
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      createdAt
      id
      metadata
      name
      owner
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListConversationPirateChatsQueryVariables, APITypes.ListConversationPirateChatsQuery>;

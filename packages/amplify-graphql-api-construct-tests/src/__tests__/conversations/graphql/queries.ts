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
      toolResult {
        status
        content {
          document {
            format
            name
            source {
              bytes
            }
          }
          image {
            format
            source {
              bytes
            }
          }
          json
          text
        }
        toolUseId
      }
      toolUse {
        input
        name
        toolUseId
      }
      image {
        format
        source {
          bytes
        }
      }
      document {
        format
        name
        source {
          bytes
        }
      }
    }
    conversation {
      createdAt
      id
      metadata
      name
      owner
      updatedAt
    }
    conversationId
    createdAt
    id
    owner
    role
    toolConfiguration {
      tools {
        toolSpec {
          description
          inputSchema {
            json
          }
          name
        }
      }
    }
    updatedAt

  }
}
` as GeneratedQuery<APITypes.GetConversationMessagePirateChatQueryVariables, APITypes.GetConversationMessagePirateChatQuery>;
export const getConversationPirateChat = /* GraphQL */ `query GetConversationPirateChat($id: ID!) {
  getConversationPirateChat(id: $id) {
    createdAt
    id
    messages {
      nextToken

    }
    metadata
    name
    owner
    updatedAt

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
      content {
        text
        toolResult {
          status
          content {
            document {
              format
              name
              source {
                bytes
              }
            }
            image {
              format
              source {
                bytes
              }
            }
            json
            text
          }
          toolUseId
        }
        toolUse {
          input
          name
          toolUseId
        }
        image {
          format
          source {
            bytes
          }
        }
        document {
          format
          name
          source {
            bytes
          }
        }
      }
      associatedUserMessageId
      conversationId
      createdAt
      id
      owner
      role
      updatedAt
    }
    nextToken
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
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListConversationPirateChatsQueryVariables, APITypes.ListConversationPirateChatsQuery>;

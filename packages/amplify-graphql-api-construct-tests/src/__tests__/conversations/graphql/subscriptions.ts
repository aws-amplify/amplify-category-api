/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateAssistantResponseDisabledModelChat =
  /* GraphQL */ `subscription OnCreateAssistantResponseDisabledModelChat($conversationId: ID) {
  onCreateAssistantResponseDisabledModelChat(conversationId: $conversationId) {
    associatedUserMessageId
    contentBlockDeltaIndex
    contentBlockDoneAtIndex
    contentBlockIndex
    contentBlockText
    contentBlockToolUse {
      input
      name
      toolUseId
    }
    conversationId
    errors {
      errorType
      message
    }
    id
    owner
    stopReason
  }
}
` as GeneratedSubscription<
    APITypes.OnCreateAssistantResponseDisabledModelChatSubscriptionVariables,
    APITypes.OnCreateAssistantResponseDisabledModelChatSubscription
  >;

export const onCreateAssistantResponsePirateChat = /* GraphQL */ `subscription OnCreateAssistantResponsePirateChat($conversationId: ID) {
  onCreateAssistantResponsePirateChat(conversationId: $conversationId) {
    associatedUserMessageId
    contentBlockDeltaIndex
    contentBlockDoneAtIndex
    contentBlockIndex
    contentBlockText
    contentBlockToolUse {
      input
      name
      toolUseId
    }
    conversationId
    errors {
      errorType
      message
    }
    id
    owner
    stopReason
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
` as GeneratedSubscription<
  APITypes.OnCreateConversationMessagePirateChatSubscriptionVariables,
  APITypes.OnCreateConversationMessagePirateChatSubscription
>;

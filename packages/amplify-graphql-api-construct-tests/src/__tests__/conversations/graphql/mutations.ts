/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createAssistantResponsePirateChat = /* GraphQL */ `mutation CreateAssistantResponsePirateChat(
  $input: CreateConversationMessagePirateChatAssistantInput!
) {
  createAssistantResponsePirateChat(input: $input) {
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
` as GeneratedMutation<APITypes.CreateAssistantResponsePirateChatMutationVariables, APITypes.CreateAssistantResponsePirateChatMutation>;
export const createConversationMessagePirateChat = /* GraphQL */ `mutation CreateConversationMessagePirateChat(
  $condition: ModelConversationMessagePirateChatConditionInput
  $input: CreateConversationMessagePirateChatInput!
) {
  createConversationMessagePirateChat(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateConversationMessagePirateChatMutationVariables, APITypes.CreateConversationMessagePirateChatMutation>;
export const createConversationPirateChat = /* GraphQL */ `mutation CreateConversationPirateChat(
  $condition: ModelConversationPirateChatConditionInput
  $input: CreateConversationPirateChatInput!
) {
  createConversationPirateChat(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateConversationPirateChatMutationVariables, APITypes.CreateConversationPirateChatMutation>;
export const deleteConversationMessagePirateChat = /* GraphQL */ `mutation DeleteConversationMessagePirateChat(
  $condition: ModelConversationMessagePirateChatConditionInput
  $input: DeleteConversationMessagePirateChatInput!
) {
  deleteConversationMessagePirateChat(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteConversationMessagePirateChatMutationVariables, APITypes.DeleteConversationMessagePirateChatMutation>;
export const deleteConversationPirateChat = /* GraphQL */ `mutation DeleteConversationPirateChat(
  $condition: ModelConversationPirateChatConditionInput
  $input: DeleteConversationPirateChatInput!
) {
  deleteConversationPirateChat(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteConversationPirateChatMutationVariables, APITypes.DeleteConversationPirateChatMutation>;
export const pirateChat = /* GraphQL */ `mutation PirateChat(
  $aiContext: AWSJSON
  $content: [ContentBlockInput]
  $conversationId: ID!
  $toolConfiguration: ToolConfigurationInput
) {
  pirateChat(
    aiContext: $aiContext
    content: $content
    conversationId: $conversationId
    toolConfiguration: $toolConfiguration
  ) {
    aiContext
    content {
      text
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

    ... on ConversationMessagePirateChat {
      associatedUserMessageId
      conversation {
        createdAt
        id
        metadata
        name
        owner
        updatedAt
        __typename
      }
    }
  }
}
` as GeneratedMutation<APITypes.PirateChatMutationVariables, APITypes.PirateChatMutation>;
export const updateConversationPirateChat = /* GraphQL */ `mutation UpdateConversationPirateChat(
  $condition: ModelConversationPirateChatConditionInput
  $input: UpdateConversationPirateChatInput!
) {
  updateConversationPirateChat(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdateConversationPirateChatMutationVariables, APITypes.UpdateConversationPirateChatMutation>;

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
` as GeneratedMutation<APITypes.CreateAssistantResponsePirateChatMutationVariables, APITypes.CreateAssistantResponsePirateChatMutation>;
export const createAssistantResponseStreamPirateChat = /* GraphQL */ `mutation CreateAssistantResponseStreamPirateChat(
  $input: CreateConversationMessagePirateChatAssistantStreamingInput!
) {
  createAssistantResponseStreamPirateChat(input: $input) {
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
    id
    owner
    stopReason
  }
}
` as GeneratedMutation<
  APITypes.CreateAssistantResponseStreamPirateChatMutationVariables,
  APITypes.CreateAssistantResponseStreamPirateChatMutation
>;

export const createConversationMessagePirateChat = /* GraphQL */ `mutation CreateConversationMessagePirateChat(
  $condition: ModelConversationMessagePirateChatConditionInput
  $input: CreateConversationMessagePirateChatInput!
) {
  createConversationMessagePirateChat(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateConversationMessagePirateChatMutationVariables, APITypes.CreateConversationMessagePirateChatMutation>;

export const createConversationDisabledModelChat = /* GraphQL */ `mutation CreateConversationDisabledModelChat(
  $condition: ModelConversationDisabledModelChatConditionInput
  $input: CreateConversationDisabledModelChatInput!
) {
  createConversationDisabledModelChat(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateConversationDisabledModelChatMutationVariables, APITypes.CreateConversationDisabledModelChatMutation>;

export const createConversationPirateChat = /* GraphQL */ `mutation CreateConversationPirateChat(
  $condition: ModelConversationPirateChatConditionInput
  $input: CreateConversationPirateChatInput!
) {
  createConversationPirateChat(condition: $condition, input: $input) {
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
    }
    metadata
    name
    owner
    updatedAt

  }
}
` as GeneratedMutation<APITypes.DeleteConversationPirateChatMutationVariables, APITypes.DeleteConversationPirateChatMutation>;

export const disabledModelChat = /* GraphQL */ `mutation DisabledModelChat(
  $aiContext: AWSJSON
  $content: [ContentBlockInput]
  $conversationId: ID!
  $toolConfiguration: ToolConfigurationInput
) {
  disabledModelChat(
    aiContext: $aiContext
    content: $content
    conversationId: $conversationId
    toolConfiguration: $toolConfiguration
  ) {
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

    ... on ConversationMessageDisabledModelChat {
      associatedUserMessageId
      conversation {
        createdAt
        id
        metadata
        name
        owner
        updatedAt
      }
    }
  }
}
` as GeneratedMutation<APITypes.DisabledModelChatMutationVariables, APITypes.DisabledModelChatMutation>;

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

    ... on ConversationMessagePirateChat {
      associatedUserMessageId
      conversation {
        createdAt
        id
        metadata
        name
        owner
        updatedAt

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
    }
    metadata
    name
    owner
    updatedAt
  }
}
` as GeneratedMutation<APITypes.UpdateConversationPirateChatMutationVariables, APITypes.UpdateConversationPirateChatMutation>;

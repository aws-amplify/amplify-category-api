/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type ConversationDisabledModelChat = {
  createdAt: string;
  id: string;
  messages?: ModelConversationMessageDisabledModelChatConnection | null;
  metadata?: string | null;
  name?: string | null;
  owner?: string | null;
  updatedAt: string;
};

export type ModelConversationMessageDisabledModelChatConnection = {
  items: Array<ConversationMessageDisabledModelChat | null>;
  nextToken?: string | null;
};

export type ConversationMessageDisabledModelChat = {
  aiContext?: string | null;
  associatedUserMessageId?: string | null;
  content?: Array<AmplifyAIContentBlock | null> | null;
  conversation?: ConversationDisabledModelChat | null;
  conversationId: string;
  createdAt: string;
  id: string;
  owner?: string | null;
  role?: AmplifyAIConversationParticipantRole | null;
  toolConfiguration?: AmplifyAIToolConfiguration | null;
  updatedAt: string;
};

export type AmplifyAIConversationMessage = {
  aiContext?: string | null;
  associatedUserMessageId?: string | null;
  content?: Array<AmplifyAIContentBlock | null> | null;
  conversationId: string;
  createdAt?: string | null;
  id: string;
  owner?: string | null;
  role?: AmplifyAIConversationParticipantRole | null;
  toolConfiguration?: AmplifyAIToolConfiguration | null;
  updatedAt?: string | null;
};

export type ConversationMessagePirateChat = {
  aiContext?: string | null;
  associatedUserMessageId?: string | null;
  content?: Array<AmplifyAIContentBlock | null> | null;
  conversation?: ConversationPirateChat | null;
  conversationId: string;
  createdAt: string;
  id: string;
  owner?: string | null;
  role?: AmplifyAIConversationParticipantRole | null;
  toolConfiguration?: AmplifyAIToolConfiguration | null;
  updatedAt: string;
};

export type AmplifyAIContentBlock = {
  document?: AmplifyAIDocumentBlock | null;
  image?: AmplifyAIImageBlock | null;
  text?: string | null;
  toolResult?: AmplifyAIToolResultBlock | null;
  toolUse?: AmplifyAIToolUseBlock | null;
};

export type AmplifyAIDocumentBlock = {
  format: string;
  name: string;
  source: AmplifyAIDocumentBlockSource;
};

export type AmplifyAIDocumentBlockSource = {
  bytes?: string | null;
};

export type AmplifyAIImageBlock = {
  format: string;
  source: AmplifyAIImageBlockSource;
};

export type AmplifyAIImageBlockSource = {
  bytes?: string | null;
};

export type AmplifyAIToolResultBlock = {
  content: Array<AmplifyAIToolResultContentBlock>;
  status?: string | null;
  toolUseId: string;
};

export type AmplifyAIToolResultContentBlock = {
  document?: AmplifyAIDocumentBlock | null;
  image?: AmplifyAIImageBlock | null;
  json?: string | null;
  text?: string | null;
};

export type AmplifyAIToolUseBlock = {
  input: string;
  name: string;
  toolUseId: string;
};

export type ConversationPirateChat = {
  createdAt: string;
  id: string;
  messages?: ModelConversationMessagePirateChatConnection | null;
  metadata?: string | null;
  name?: string | null;
  owner?: string | null;
  updatedAt: string;
};

export type ModelConversationMessagePirateChatConnection = {
  items: Array<ConversationMessagePirateChat | null>;
  nextToken?: string | null;
};

export enum AmplifyAIConversationParticipantRole {
  assistant = 'assistant',
  user = 'user',
}

export type AmplifyAIToolConfiguration = {
  tools?: Array<AmplifyAITool | null> | null;
};

export type AmplifyAITool = {
  toolSpec?: AmplifyAIToolSpecification | null;
};

export type AmplifyAIToolSpecification = {
  description?: string | null;
  inputSchema: AmplifyAIToolInputSchema;
  name: string;
};

export type AmplifyAIToolInputSchema = {
  json?: string | null;
};

export type ModelConversationDisabledModelChatFilterInput = {
  and?: Array<ModelConversationDisabledModelChatFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  metadata?: ModelStringInput | null;
  name?: ModelStringInput | null;
  not?: ModelConversationDisabledModelChatFilterInput | null;
  or?: Array<ModelConversationDisabledModelChatFilterInput | null> | null;
  owner?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelStringInput = {
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  beginsWith?: string | null;
  between?: Array<string | null> | null;
  contains?: string | null;
  eq?: string | null;
  ge?: string | null;
  gt?: string | null;
  le?: string | null;
  lt?: string | null;
  ne?: string | null;
  notContains?: string | null;
  size?: ModelSizeInput | null;
};

export enum ModelAttributeTypes {
  _null = '_null',
  binary = 'binary',
  binarySet = 'binarySet',
  bool = 'bool',
  list = 'list',
  map = 'map',
  number = 'number',
  numberSet = 'numberSet',
  string = 'string',
  stringSet = 'stringSet',
}

export type ModelSizeInput = {
  between?: Array<number | null> | null;
  eq?: number | null;
  ge?: number | null;
  gt?: number | null;
  le?: number | null;
  lt?: number | null;
  ne?: number | null;
};

export type ModelIDInput = {
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  beginsWith?: string | null;
  between?: Array<string | null> | null;
  contains?: string | null;
  eq?: string | null;
  ge?: string | null;
  gt?: string | null;
  le?: string | null;
  lt?: string | null;
  ne?: string | null;
  notContains?: string | null;
  size?: ModelSizeInput | null;
};

export type ModelConversationDisabledModelChatConnection = {
  items: Array<ConversationDisabledModelChat | null>;
  nextToken?: string | null;
};

export type ModelConversationMessageDisabledModelChatFilterInput = {
  aiContext?: ModelStringInput | null;
  and?: Array<ModelConversationMessageDisabledModelChatFilterInput | null> | null;
  associatedUserMessageId?: ModelIDInput | null;
  conversationId?: ModelIDInput | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  not?: ModelConversationMessageDisabledModelChatFilterInput | null;
  or?: Array<ModelConversationMessageDisabledModelChatFilterInput | null> | null;
  owner?: ModelStringInput | null;
  role?: ModelAmplifyAIConversationParticipantRoleInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelAmplifyAIConversationParticipantRoleInput = {
  eq?: AmplifyAIConversationParticipantRole | null;
  ne?: AmplifyAIConversationParticipantRole | null;
};

export type ModelConversationMessagePirateChatFilterInput = {
  aiContext?: ModelStringInput | null;
  and?: Array<ModelConversationMessagePirateChatFilterInput | null> | null;
  associatedUserMessageId?: ModelIDInput | null;
  conversationId?: ModelIDInput | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  not?: ModelConversationMessagePirateChatFilterInput | null;
  or?: Array<ModelConversationMessagePirateChatFilterInput | null> | null;
  owner?: ModelStringInput | null;
  role?: ModelAmplifyAIConversationParticipantRoleInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelConversationPirateChatFilterInput = {
  and?: Array<ModelConversationPirateChatFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  metadata?: ModelStringInput | null;
  name?: ModelStringInput | null;
  not?: ModelConversationPirateChatFilterInput | null;
  or?: Array<ModelConversationPirateChatFilterInput | null> | null;
  owner?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelConversationPirateChatConnection = {
  items: Array<ConversationPirateChat | null>;
  nextToken?: string | null;
};

export type CreateConversationMessageDisabledModelChatAssistantInput = {
  associatedUserMessageId?: string | null;
  content?: Array<AmplifyAIContentBlockInput | null> | null;
  conversationId?: string | null;
};

export type AmplifyAIContentBlockInput = {
  document?: AmplifyAIDocumentBlockInput | null;
  image?: AmplifyAIImageBlockInput | null;
  text?: string | null;
  toolResult?: AmplifyAIToolResultBlockInput | null;
  toolUse?: AmplifyAIToolUseBlockInput | null;
};

export type AmplifyAIDocumentBlockInput = {
  format: string;
  name: string;
  source: AmplifyAIDocumentBlockSourceInput;
};

export type AmplifyAIDocumentBlockSourceInput = {
  bytes?: string | null;
};

export type AmplifyAIImageBlockInput = {
  format: string;
  source: AmplifyAIImageBlockSourceInput;
};

export type AmplifyAIImageBlockSourceInput = {
  bytes?: string | null;
};

export type AmplifyAIToolResultBlockInput = {
  content: Array<AmplifyAIToolResultContentBlockInput>;
  status?: string | null;
  toolUseId: string;
};

export type AmplifyAIToolResultContentBlockInput = {
  document?: AmplifyAIDocumentBlockInput | null;
  image?: AmplifyAIImageBlockInput | null;
  json?: string | null;
  text?: string | null;
};

export type AmplifyAIToolUseBlockInput = {
  input: string;
  name: string;
  toolUseId: string;
};

export type CreateConversationMessagePirateChatAssistantInput = {
  associatedUserMessageId?: string | null;
  content?: Array<AmplifyAIContentBlockInput | null> | null;
  conversationId?: string | null;
};

export type CreateConversationMessageDisabledModelChatAssistantStreamingInput = {
  accumulatedTurnContent?: Array<AmplifyAIContentBlockInput | null> | null;
  associatedUserMessageId: string;
  contentBlockDeltaIndex?: number | null;
  contentBlockDoneAtIndex?: number | null;
  contentBlockIndex?: number | null;
  contentBlockText?: string | null;
  contentBlockToolUse?: string | null;
  conversationId: string;
  errors?: Array<AmplifyAIConversationTurnErrorInput | null> | null;
  stopReason?: string | null;
};

export type AmplifyAIConversationTurnErrorInput = {
  errorType: string;
  message: string;
};

export type AmplifyAIConversationMessageStreamPart = {
  associatedUserMessageId: string;
  contentBlockDeltaIndex?: number | null;
  contentBlockDoneAtIndex?: number | null;
  contentBlockIndex?: number | null;
  contentBlockText?: string | null;
  contentBlockToolUse?: AmplifyAIToolUseBlock | null;
  conversationId: string;
  errors?: Array<AmplifyAIConversationTurnError | null> | null;
  id: string;
  owner?: string | null;
  stopReason?: string | null;
};

export type AmplifyAIConversationTurnError = {
  errorType: string;
  message: string;
};

export type CreateConversationMessagePirateChatAssistantStreamingInput = {
  accumulatedTurnContent?: Array<AmplifyAIContentBlockInput | null> | null;
  associatedUserMessageId: string;
  contentBlockDeltaIndex?: number | null;
  contentBlockDoneAtIndex?: number | null;
  contentBlockIndex?: number | null;
  contentBlockText?: string | null;
  contentBlockToolUse?: string | null;
  conversationId: string;
  errors?: Array<AmplifyAIConversationTurnErrorInput | null> | null;
  stopReason?: string | null;
};

export type ModelConversationDisabledModelChatConditionInput = {
  and?: Array<ModelConversationDisabledModelChatConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  metadata?: ModelStringInput | null;
  name?: ModelStringInput | null;
  not?: ModelConversationDisabledModelChatConditionInput | null;
  or?: Array<ModelConversationDisabledModelChatConditionInput | null> | null;
  owner?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateConversationDisabledModelChatInput = {
  id?: string | null;
  metadata?: string | null;
  name?: string | null;
};

export type ModelConversationMessageDisabledModelChatConditionInput = {
  aiContext?: ModelStringInput | null;
  and?: Array<ModelConversationMessageDisabledModelChatConditionInput | null> | null;
  associatedUserMessageId?: ModelIDInput | null;
  conversationId?: ModelIDInput | null;
  createdAt?: ModelStringInput | null;
  not?: ModelConversationMessageDisabledModelChatConditionInput | null;
  or?: Array<ModelConversationMessageDisabledModelChatConditionInput | null> | null;
  owner?: ModelStringInput | null;
  role?: ModelAmplifyAIConversationParticipantRoleInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateConversationMessageDisabledModelChatInput = {
  aiContext?: string | null;
  associatedUserMessageId?: string | null;
  content?: Array<AmplifyAIContentBlockInput | null> | null;
  conversationId: string;
  id?: string | null;
  role?: AmplifyAIConversationParticipantRole | null;
  toolConfiguration?: AmplifyAIToolConfigurationInput | null;
};

export type AmplifyAIToolConfigurationInput = {
  tools?: Array<AmplifyAIToolInput | null> | null;
};

export type AmplifyAIToolInput = {
  toolSpec?: AmplifyAIToolSpecificationInput | null;
};

export type AmplifyAIToolSpecificationInput = {
  description?: string | null;
  inputSchema: AmplifyAIToolInputSchemaInput;
  name: string;
};

export type AmplifyAIToolInputSchemaInput = {
  json?: string | null;
};

export type ModelConversationMessagePirateChatConditionInput = {
  aiContext?: ModelStringInput | null;
  and?: Array<ModelConversationMessagePirateChatConditionInput | null> | null;
  associatedUserMessageId?: ModelIDInput | null;
  conversationId?: ModelIDInput | null;
  createdAt?: ModelStringInput | null;
  not?: ModelConversationMessagePirateChatConditionInput | null;
  or?: Array<ModelConversationMessagePirateChatConditionInput | null> | null;
  owner?: ModelStringInput | null;
  role?: ModelAmplifyAIConversationParticipantRoleInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateConversationMessagePirateChatInput = {
  aiContext?: string | null;
  associatedUserMessageId?: string | null;
  content?: Array<AmplifyAIContentBlockInput | null> | null;
  conversationId: string;
  id?: string | null;
  role?: AmplifyAIConversationParticipantRole | null;
  toolConfiguration?: AmplifyAIToolConfigurationInput | null;
};

export type ModelConversationPirateChatConditionInput = {
  and?: Array<ModelConversationPirateChatConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  metadata?: ModelStringInput | null;
  name?: ModelStringInput | null;
  not?: ModelConversationPirateChatConditionInput | null;
  or?: Array<ModelConversationPirateChatConditionInput | null> | null;
  owner?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateConversationPirateChatInput = {
  id?: string | null;
  metadata?: string | null;
  name?: string | null;
};

export type DeleteConversationDisabledModelChatInput = {
  id: string;
};

export type DeleteConversationMessageDisabledModelChatInput = {
  id: string;
};

export type DeleteConversationMessagePirateChatInput = {
  id: string;
};

export type DeleteConversationPirateChatInput = {
  id: string;
};

export type UpdateConversationDisabledModelChatInput = {
  id: string;
  metadata?: string | null;
  name?: string | null;
};

export type UpdateConversationPirateChatInput = {
  id: string;
  metadata?: string | null;
  name?: string | null;
};

export type ModelSubscriptionConversationMessageDisabledModelChatFilterInput = {
  aiContext?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionConversationMessageDisabledModelChatFilterInput | null> | null;
  associatedUserMessageId?: ModelSubscriptionIDInput | null;
  conversationId?: ModelSubscriptionIDInput | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionIDInput | null;
  or?: Array<ModelSubscriptionConversationMessageDisabledModelChatFilterInput | null> | null;
  owner?: ModelStringInput | null;
  role?: ModelSubscriptionStringInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null;
  between?: Array<string | null> | null;
  contains?: string | null;
  eq?: string | null;
  ge?: string | null;
  gt?: string | null;
  in?: Array<string | null> | null;
  le?: string | null;
  lt?: string | null;
  ne?: string | null;
  notContains?: string | null;
  notIn?: Array<string | null> | null;
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null;
  between?: Array<string | null> | null;
  contains?: string | null;
  eq?: string | null;
  ge?: string | null;
  gt?: string | null;
  in?: Array<string | null> | null;
  le?: string | null;
  lt?: string | null;
  ne?: string | null;
  notContains?: string | null;
  notIn?: Array<string | null> | null;
};

export type ModelSubscriptionConversationMessagePirateChatFilterInput = {
  aiContext?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionConversationMessagePirateChatFilterInput | null> | null;
  associatedUserMessageId?: ModelSubscriptionIDInput | null;
  conversationId?: ModelSubscriptionIDInput | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionIDInput | null;
  or?: Array<ModelSubscriptionConversationMessagePirateChatFilterInput | null> | null;
  owner?: ModelStringInput | null;
  role?: ModelSubscriptionStringInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type GetConversationDisabledModelChatQueryVariables = {
  id: string;
};

export type GetConversationDisabledModelChatQuery = {
  getConversationDisabledModelChat?: {
    createdAt: string;
    id: string;
    messages?: {
      items: Array<{
        aiContext?: string | null;
        associatedUserMessageId?: string | null;
        content?: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          text?: string | null;
          toolResult?: {
            status?: string | null;
            toolUseId: string;
          } | null;
          toolUse?: {
            input: string;
            name: string;
            toolUseId: string;
          } | null;
        } | null> | null;
        conversation?: {
          createdAt: string;
          id: string;
          messages?: {
            nextToken?: string | null;
          } | null;
          metadata?: string | null;
          name?: string | null;
          owner?: string | null;
          updatedAt: string;
        } | null;
        conversationId: string;
        createdAt: string;
        id: string;
        owner?: string | null;
        role?: AmplifyAIConversationParticipantRole | null;
        toolConfiguration?: {
          tools?: Array<{} | null> | null;
        } | null;
        updatedAt: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type GetConversationMessageDisabledModelChatQueryVariables = {
  id: string;
};

export type GetConversationMessageDisabledModelChatQuery = {
  getConversationMessageDisabledModelChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

export type GetConversationMessagePirateChatQueryVariables = {
  id: string;
};

export type GetConversationMessagePirateChatQuery = {
  getConversationMessagePirateChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

export type GetConversationPirateChatQueryVariables = {
  id: string;
};

export type GetConversationPirateChatQuery = {
  getConversationPirateChat?: {
    createdAt: string;
    id: string;
    messages?: {
      items: Array<{
        aiContext?: string | null;
        associatedUserMessageId?: string | null;
        content?: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          text?: string | null;
          toolResult?: {
            status?: string | null;
            toolUseId: string;
          } | null;
          toolUse?: {
            input: string;
            name: string;
            toolUseId: string;
          } | null;
        } | null> | null;
        conversation?: {
          createdAt: string;
          id: string;
          messages?: {
            nextToken?: string | null;
          } | null;
          metadata?: string | null;
          name?: string | null;
          owner?: string | null;
          updatedAt: string;
        } | null;
        conversationId: string;
        createdAt: string;
        id: string;
        owner?: string | null;
        role?: AmplifyAIConversationParticipantRole | null;
        toolConfiguration?: {
          tools?: Array<{} | null> | null;
        } | null;
        updatedAt: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type ListConversationDisabledModelChatsQueryVariables = {
  filter?: ModelConversationDisabledModelChatFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListConversationDisabledModelChatsQuery = {
  listConversationDisabledModelChats?: {
    items: Array<{
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type ListConversationMessageDisabledModelChatsQueryVariables = {
  filter?: ModelConversationMessageDisabledModelChatFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListConversationMessageDisabledModelChatsQuery = {
  listConversationMessageDisabledModelChats?: {
    items: Array<{
      aiContext?: string | null;
      associatedUserMessageId?: string | null;
      content?: Array<{
        document?: {
          format: string;
          name: string;
          source: {
            bytes?: string | null;
          };
        } | null;
        image?: {
          format: string;
          source: {
            bytes?: string | null;
          };
        } | null;
        text?: string | null;
        toolResult?: {
          content: Array<{
            json?: string | null;
            text?: string | null;
          }>;
          status?: string | null;
          toolUseId: string;
        } | null;
        toolUse?: {
          input: string;
          name: string;
          toolUseId: string;
        } | null;
      } | null> | null;
      conversation?: {
        createdAt: string;
        id: string;
        messages?: {
          items: Array<{
            aiContext?: string | null;
            associatedUserMessageId?: string | null;
            conversationId: string;
            createdAt: string;
            id: string;
            owner?: string | null;
            role?: AmplifyAIConversationParticipantRole | null;
            updatedAt: string;
          } | null>;
          nextToken?: string | null;
        } | null;
        metadata?: string | null;
        name?: string | null;
        owner?: string | null;
        updatedAt: string;
      } | null;
      conversationId: string;
      createdAt: string;
      id: string;
      owner?: string | null;
      role?: AmplifyAIConversationParticipantRole | null;
      toolConfiguration?: {
        tools?: Array<{
          toolSpec?: {
            description?: string | null;
            name: string;
          } | null;
        } | null> | null;
      } | null;
      updatedAt: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type ListConversationMessagePirateChatsQueryVariables = {
  filter?: ModelConversationMessagePirateChatFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListConversationMessagePirateChatsQuery = {
  listConversationMessagePirateChats?: {
    items: Array<{
      aiContext?: string | null;
      associatedUserMessageId?: string | null;
      content?: Array<{
        document?: {
          format: string;
          name: string;
          source: {
            bytes?: string | null;
          };
        } | null;
        image?: {
          format: string;
          source: {
            bytes?: string | null;
          };
        } | null;
        text?: string | null;
        toolResult?: {
          content: Array<{
            json?: string | null;
            text?: string | null;
          }>;
          status?: string | null;
          toolUseId: string;
        } | null;
        toolUse?: {
          input: string;
          name: string;
          toolUseId: string;
        } | null;
      } | null> | null;
      conversation?: {
        createdAt: string;
        id: string;
        messages?: {
          items: Array<{
            aiContext?: string | null;
            associatedUserMessageId?: string | null;
            conversationId: string;
            createdAt: string;
            id: string;
            owner?: string | null;
            role?: AmplifyAIConversationParticipantRole | null;
            updatedAt: string;
          } | null>;
          nextToken?: string | null;
        } | null;
        metadata?: string | null;
        name?: string | null;
        owner?: string | null;
        updatedAt: string;
      } | null;
      conversationId: string;
      createdAt: string;
      id: string;
      owner?: string | null;
      role?: AmplifyAIConversationParticipantRole | null;
      toolConfiguration?: {
        tools?: Array<{
          toolSpec?: {
            description?: string | null;
            name: string;
          } | null;
        } | null> | null;
      } | null;
      updatedAt: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type ListConversationPirateChatsQueryVariables = {
  filter?: ModelConversationPirateChatFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListConversationPirateChatsQuery = {
  listConversationPirateChats?: {
    items: Array<{
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type CreateAssistantResponseDisabledModelChatMutationVariables = {
  input: CreateConversationMessageDisabledModelChatAssistantInput;
};

export type CreateAssistantResponseDisabledModelChatMutation = {
  createAssistantResponseDisabledModelChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

export type CreateAssistantResponsePirateChatMutationVariables = {
  input: CreateConversationMessagePirateChatAssistantInput;
};

export type CreateAssistantResponsePirateChatMutation = {
  createAssistantResponsePirateChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

export type CreateAssistantResponseStreamDisabledModelChatMutationVariables = {
  input: CreateConversationMessageDisabledModelChatAssistantStreamingInput;
};

export type CreateAssistantResponseStreamDisabledModelChatMutation = {
  createAssistantResponseStreamDisabledModelChat?: {
    associatedUserMessageId: string;
    contentBlockDeltaIndex?: number | null;
    contentBlockDoneAtIndex?: number | null;
    contentBlockIndex?: number | null;
    contentBlockText?: string | null;
    contentBlockToolUse?: {
      input: string;
      name: string;
      toolUseId: string;
    } | null;
    conversationId: string;
    errors?: Array<{
      errorType: string;
      message: string;
    } | null> | null;
    id: string;
    owner?: string | null;
    stopReason?: string | null;
  } | null;
};

export type CreateAssistantResponseStreamPirateChatMutationVariables = {
  input: CreateConversationMessagePirateChatAssistantStreamingInput;
};

export type CreateAssistantResponseStreamPirateChatMutation = {
  createAssistantResponseStreamPirateChat?: {
    associatedUserMessageId: string;
    contentBlockDeltaIndex?: number | null;
    contentBlockDoneAtIndex?: number | null;
    contentBlockIndex?: number | null;
    contentBlockText?: string | null;
    contentBlockToolUse?: {
      input: string;
      name: string;
      toolUseId: string;
    } | null;
    conversationId: string;
    errors?: Array<{
      errorType: string;
      message: string;
    } | null> | null;
    id: string;
    owner?: string | null;
    stopReason?: string | null;
  } | null;
};

export type CreateConversationDisabledModelChatMutationVariables = {
  condition?: ModelConversationDisabledModelChatConditionInput | null;
  input: CreateConversationDisabledModelChatInput;
};

export type CreateConversationDisabledModelChatMutation = {
  createConversationDisabledModelChat?: {
    createdAt: string;
    id: string;
    messages?: {
      items: Array<{
        aiContext?: string | null;
        associatedUserMessageId?: string | null;
        content?: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          text?: string | null;
          toolResult?: {
            status?: string | null;
            toolUseId: string;
          } | null;
          toolUse?: {
            input: string;
            name: string;
            toolUseId: string;
          } | null;
        } | null> | null;
        conversation?: {
          createdAt: string;
          id: string;
          messages?: {
            nextToken?: string | null;
          } | null;
          metadata?: string | null;
          name?: string | null;
          owner?: string | null;
          updatedAt: string;
        } | null;
        conversationId: string;
        createdAt: string;
        id: string;
        owner?: string | null;
        role?: AmplifyAIConversationParticipantRole | null;
        toolConfiguration?: {
          tools?: Array<{} | null> | null;
        } | null;
        updatedAt: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type CreateConversationMessageDisabledModelChatMutationVariables = {
  condition?: ModelConversationMessageDisabledModelChatConditionInput | null;
  input: CreateConversationMessageDisabledModelChatInput;
};

export type CreateConversationMessageDisabledModelChatMutation = {
  createConversationMessageDisabledModelChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

export type CreateConversationMessagePirateChatMutationVariables = {
  condition?: ModelConversationMessagePirateChatConditionInput | null;
  input: CreateConversationMessagePirateChatInput;
};

export type CreateConversationMessagePirateChatMutation = {
  createConversationMessagePirateChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

export type CreateConversationPirateChatMutationVariables = {
  condition?: ModelConversationPirateChatConditionInput | null;
  input: CreateConversationPirateChatInput;
};

export type CreateConversationPirateChatMutation = {
  createConversationPirateChat?: {
    createdAt: string;
    id: string;
    messages?: {
      items: Array<{
        aiContext?: string | null;
        associatedUserMessageId?: string | null;
        content?: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          text?: string | null;
          toolResult?: {
            status?: string | null;
            toolUseId: string;
          } | null;
          toolUse?: {
            input: string;
            name: string;
            toolUseId: string;
          } | null;
        } | null> | null;
        conversation?: {
          createdAt: string;
          id: string;
          messages?: {
            nextToken?: string | null;
          } | null;
          metadata?: string | null;
          name?: string | null;
          owner?: string | null;
          updatedAt: string;
        } | null;
        conversationId: string;
        createdAt: string;
        id: string;
        owner?: string | null;
        role?: AmplifyAIConversationParticipantRole | null;
        toolConfiguration?: {
          tools?: Array<{} | null> | null;
        } | null;
        updatedAt: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type DeleteConversationDisabledModelChatMutationVariables = {
  condition?: ModelConversationDisabledModelChatConditionInput | null;
  input: DeleteConversationDisabledModelChatInput;
};

export type DeleteConversationDisabledModelChatMutation = {
  deleteConversationDisabledModelChat?: {
    createdAt: string;
    id: string;
    messages?: {
      items: Array<{
        aiContext?: string | null;
        associatedUserMessageId?: string | null;
        content?: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          text?: string | null;
          toolResult?: {
            status?: string | null;
            toolUseId: string;
          } | null;
          toolUse?: {
            input: string;
            name: string;
            toolUseId: string;
          } | null;
        } | null> | null;
        conversation?: {
          createdAt: string;
          id: string;
          messages?: {
            nextToken?: string | null;
          } | null;
          metadata?: string | null;
          name?: string | null;
          owner?: string | null;
          updatedAt: string;
        } | null;
        conversationId: string;
        createdAt: string;
        id: string;
        owner?: string | null;
        role?: AmplifyAIConversationParticipantRole | null;
        toolConfiguration?: {
          tools?: Array<{} | null> | null;
        } | null;
        updatedAt: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type DeleteConversationMessageDisabledModelChatMutationVariables = {
  condition?: ModelConversationMessageDisabledModelChatConditionInput | null;
  input: DeleteConversationMessageDisabledModelChatInput;
};

export type DeleteConversationMessageDisabledModelChatMutation = {
  deleteConversationMessageDisabledModelChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

export type DeleteConversationMessagePirateChatMutationVariables = {
  condition?: ModelConversationMessagePirateChatConditionInput | null;
  input: DeleteConversationMessagePirateChatInput;
};

export type DeleteConversationMessagePirateChatMutation = {
  deleteConversationMessagePirateChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

export type DeleteConversationPirateChatMutationVariables = {
  condition?: ModelConversationPirateChatConditionInput | null;
  input: DeleteConversationPirateChatInput;
};

export type DeleteConversationPirateChatMutation = {
  deleteConversationPirateChat?: {
    createdAt: string;
    id: string;
    messages?: {
      items: Array<{
        aiContext?: string | null;
        associatedUserMessageId?: string | null;
        content?: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          text?: string | null;
          toolResult?: {
            status?: string | null;
            toolUseId: string;
          } | null;
          toolUse?: {
            input: string;
            name: string;
            toolUseId: string;
          } | null;
        } | null> | null;
        conversation?: {
          createdAt: string;
          id: string;
          messages?: {
            nextToken?: string | null;
          } | null;
          metadata?: string | null;
          name?: string | null;
          owner?: string | null;
          updatedAt: string;
        } | null;
        conversationId: string;
        createdAt: string;
        id: string;
        owner?: string | null;
        role?: AmplifyAIConversationParticipantRole | null;
        toolConfiguration?: {
          tools?: Array<{} | null> | null;
        } | null;
        updatedAt: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type DisabledModelChatMutationVariables = {
  aiContext?: string | null;
  content?: Array<AmplifyAIContentBlockInput | null> | null;
  conversationId: string;
  toolConfiguration?: AmplifyAIToolConfigurationInput | null;
};

export type DisabledModelChatMutation = {
  disabledModelChat:
    | (
        | {
            aiContext?: string | null;
            associatedUserMessageId?: string | null;
            content?: Array<{
              document?: {
                format: string;
                name: string;
                source: {
                  bytes?: string | null;
                };
              } | null;
              image?: {
                format: string;
                source: {
                  bytes?: string | null;
                };
              } | null;
              text?: string | null;
              toolResult?: {
                content: Array<{
                  document?: {
                    format: string;
                    name: string;
                  } | null;
                  image?: {
                    format: string;
                  } | null;
                  json?: string | null;
                  text?: string | null;
                }>;
                status?: string | null;
                toolUseId: string;
              } | null;
              toolUse?: {
                input: string;
                name: string;
                toolUseId: string;
              } | null;
            } | null> | null;
            conversationId: string;
            createdAt?: string | null;
            id: string;
            owner?: string | null;
            role?: AmplifyAIConversationParticipantRole | null;
            toolConfiguration?: {
              tools?: Array<{
                toolSpec?: {
                  description?: string | null;
                  inputSchema: {
                    json?: string | null;
                  };
                  name: string;
                } | null;
              } | null> | null;
            } | null;
            updatedAt?: string | null;
            conversation?: {
              createdAt: string;
              id: string;
              messages?: {
                items: Array<{
                  aiContext?: string | null;
                  associatedUserMessageId?: string | null;
                  content?: Array<{
                    text?: string | null;
                  } | null> | null;
                  conversation?: {
                    createdAt: string;
                    id: string;
                    metadata?: string | null;
                    name?: string | null;
                    owner?: string | null;
                    updatedAt: string;
                  } | null;
                  conversationId: string;
                  createdAt: string;
                  id: string;
                  owner?: string | null;
                  role?: AmplifyAIConversationParticipantRole | null;
                  toolConfiguration?: {} | null;
                  updatedAt: string;
                } | null>;
                nextToken?: string | null;
              } | null;
              metadata?: string | null;
              name?: string | null;
              owner?: string | null;
              updatedAt: string;
            } | null;
          }
        | {
            aiContext?: string | null;
            associatedUserMessageId?: string | null;
            content?: Array<{
              document?: {
                format: string;
                name: string;
                source: {
                  bytes?: string | null;
                };
              } | null;
              image?: {
                format: string;
                source: {
                  bytes?: string | null;
                };
              } | null;
              text?: string | null;
              toolResult?: {
                content: Array<{
                  document?: {
                    format: string;
                    name: string;
                  } | null;
                  image?: {
                    format: string;
                  } | null;
                  json?: string | null;
                  text?: string | null;
                }>;
                status?: string | null;
                toolUseId: string;
              } | null;
              toolUse?: {
                input: string;
                name: string;
                toolUseId: string;
              } | null;
            } | null> | null;
            conversationId: string;
            createdAt?: string | null;
            id: string;
            owner?: string | null;
            role?: AmplifyAIConversationParticipantRole | null;
            toolConfiguration?: {
              tools?: Array<{
                toolSpec?: {
                  description?: string | null;
                  inputSchema: {
                    json?: string | null;
                  };
                  name: string;
                } | null;
              } | null> | null;
            } | null;
            updatedAt?: string | null;
            conversation?: {
              createdAt: string;
              id: string;
              messages?: {
                items: Array<{
                  aiContext?: string | null;
                  associatedUserMessageId?: string | null;
                  content?: Array<{
                    text?: string | null;
                  } | null> | null;
                  conversation?: {
                    createdAt: string;
                    id: string;
                    metadata?: string | null;
                    name?: string | null;
                    owner?: string | null;
                    updatedAt: string;
                  } | null;
                  conversationId: string;
                  createdAt: string;
                  id: string;
                  owner?: string | null;
                  role?: AmplifyAIConversationParticipantRole | null;
                  toolConfiguration?: {} | null;
                  updatedAt: string;
                } | null>;
                nextToken?: string | null;
              } | null;
              metadata?: string | null;
              name?: string | null;
              owner?: string | null;
              updatedAt: string;
            } | null;
          }
      )
    | null;
};

export type PirateChatMutationVariables = {
  aiContext?: string | null;
  content?: Array<AmplifyAIContentBlockInput | null> | null;
  conversationId: string;
  toolConfiguration?: AmplifyAIToolConfigurationInput | null;
};

export type PirateChatMutation = {
  pirateChat:
    | (
        | {
            aiContext?: string | null;
            associatedUserMessageId?: string | null;
            content?: Array<{
              document?: {
                format: string;
                name: string;
                source: {
                  bytes?: string | null;
                };
              } | null;
              image?: {
                format: string;
                source: {
                  bytes?: string | null;
                };
              } | null;
              text?: string | null;
              toolResult?: {
                content: Array<{
                  document?: {
                    format: string;
                    name: string;
                  } | null;
                  image?: {
                    format: string;
                  } | null;
                  json?: string | null;
                  text?: string | null;
                }>;
                status?: string | null;
                toolUseId: string;
              } | null;
              toolUse?: {
                input: string;
                name: string;
                toolUseId: string;
              } | null;
            } | null> | null;
            conversationId: string;
            createdAt?: string | null;
            id: string;
            owner?: string | null;
            role?: AmplifyAIConversationParticipantRole | null;
            toolConfiguration?: {
              tools?: Array<{
                toolSpec?: {
                  description?: string | null;
                  inputSchema: {
                    json?: string | null;
                  };
                  name: string;
                } | null;
              } | null> | null;
            } | null;
            updatedAt?: string | null;
            conversation?: {
              createdAt: string;
              id: string;
              messages?: {
                items: Array<{
                  aiContext?: string | null;
                  associatedUserMessageId?: string | null;
                  content?: Array<{
                    text?: string | null;
                  } | null> | null;
                  conversation?: {
                    createdAt: string;
                    id: string;
                    metadata?: string | null;
                    name?: string | null;
                    owner?: string | null;
                    updatedAt: string;
                  } | null;
                  conversationId: string;
                  createdAt: string;
                  id: string;
                  owner?: string | null;
                  role?: AmplifyAIConversationParticipantRole | null;
                  toolConfiguration?: {} | null;
                  updatedAt: string;
                } | null>;
                nextToken?: string | null;
              } | null;
              metadata?: string | null;
              name?: string | null;
              owner?: string | null;
              updatedAt: string;
            } | null;
          }
        | {
            aiContext?: string | null;
            associatedUserMessageId?: string | null;
            content?: Array<{
              document?: {
                format: string;
                name: string;
                source: {
                  bytes?: string | null;
                };
              } | null;
              image?: {
                format: string;
                source: {
                  bytes?: string | null;
                };
              } | null;
              text?: string | null;
              toolResult?: {
                content: Array<{
                  document?: {
                    format: string;
                    name: string;
                  } | null;
                  image?: {
                    format: string;
                  } | null;
                  json?: string | null;
                  text?: string | null;
                }>;
                status?: string | null;
                toolUseId: string;
              } | null;
              toolUse?: {
                input: string;
                name: string;
                toolUseId: string;
              } | null;
            } | null> | null;
            conversationId: string;
            createdAt?: string | null;
            id: string;
            owner?: string | null;
            role?: AmplifyAIConversationParticipantRole | null;
            toolConfiguration?: {
              tools?: Array<{
                toolSpec?: {
                  description?: string | null;
                  inputSchema: {
                    json?: string | null;
                  };
                  name: string;
                } | null;
              } | null> | null;
            } | null;
            updatedAt?: string | null;
            conversation?: {
              createdAt: string;
              id: string;
              messages?: {
                items: Array<{
                  aiContext?: string | null;
                  associatedUserMessageId?: string | null;
                  content?: Array<{
                    text?: string | null;
                  } | null> | null;
                  conversation?: {
                    createdAt: string;
                    id: string;
                    metadata?: string | null;
                    name?: string | null;
                    owner?: string | null;
                    updatedAt: string;
                  } | null;
                  conversationId: string;
                  createdAt: string;
                  id: string;
                  owner?: string | null;
                  role?: AmplifyAIConversationParticipantRole | null;
                  toolConfiguration?: {} | null;
                  updatedAt: string;
                } | null>;
                nextToken?: string | null;
              } | null;
              metadata?: string | null;
              name?: string | null;
              owner?: string | null;
              updatedAt: string;
            } | null;
          }
      )
    | null;
};

export type UpdateConversationDisabledModelChatMutationVariables = {
  condition?: ModelConversationDisabledModelChatConditionInput | null;
  input: UpdateConversationDisabledModelChatInput;
};

export type UpdateConversationDisabledModelChatMutation = {
  updateConversationDisabledModelChat?: {
    createdAt: string;
    id: string;
    messages?: {
      items: Array<{
        aiContext?: string | null;
        associatedUserMessageId?: string | null;
        content?: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          text?: string | null;
          toolResult?: {
            status?: string | null;
            toolUseId: string;
          } | null;
          toolUse?: {
            input: string;
            name: string;
            toolUseId: string;
          } | null;
        } | null> | null;
        conversation?: {
          createdAt: string;
          id: string;
          messages?: {
            nextToken?: string | null;
          } | null;
          metadata?: string | null;
          name?: string | null;
          owner?: string | null;
          updatedAt: string;
        } | null;
        conversationId: string;
        createdAt: string;
        id: string;
        owner?: string | null;
        role?: AmplifyAIConversationParticipantRole | null;
        toolConfiguration?: {
          tools?: Array<{} | null> | null;
        } | null;
        updatedAt: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type UpdateConversationPirateChatMutationVariables = {
  condition?: ModelConversationPirateChatConditionInput | null;
  input: UpdateConversationPirateChatInput;
};

export type UpdateConversationPirateChatMutation = {
  updateConversationPirateChat?: {
    createdAt: string;
    id: string;
    messages?: {
      items: Array<{
        aiContext?: string | null;
        associatedUserMessageId?: string | null;
        content?: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          text?: string | null;
          toolResult?: {
            status?: string | null;
            toolUseId: string;
          } | null;
          toolUse?: {
            input: string;
            name: string;
            toolUseId: string;
          } | null;
        } | null> | null;
        conversation?: {
          createdAt: string;
          id: string;
          messages?: {
            nextToken?: string | null;
          } | null;
          metadata?: string | null;
          name?: string | null;
          owner?: string | null;
          updatedAt: string;
        } | null;
        conversationId: string;
        createdAt: string;
        id: string;
        owner?: string | null;
        role?: AmplifyAIConversationParticipantRole | null;
        toolConfiguration?: {
          tools?: Array<{} | null> | null;
        } | null;
        updatedAt: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type OnCreateAssistantResponseDisabledModelChatSubscriptionVariables = {
  conversationId?: string | null;
};

export type OnCreateAssistantResponseDisabledModelChatSubscription = {
  onCreateAssistantResponseDisabledModelChat?: {
    associatedUserMessageId: string;
    contentBlockDeltaIndex?: number | null;
    contentBlockDoneAtIndex?: number | null;
    contentBlockIndex?: number | null;
    contentBlockText?: string | null;
    contentBlockToolUse?: {
      input: string;
      name: string;
      toolUseId: string;
    } | null;
    conversationId: string;
    errors?: Array<{
      errorType: string;
      message: string;
    } | null> | null;
    id: string;
    owner?: string | null;
    stopReason?: string | null;
  } | null;
};

export type OnCreateAssistantResponsePirateChatSubscriptionVariables = {
  conversationId?: string | null;
};

export type OnCreateAssistantResponsePirateChatSubscription = {
  onCreateAssistantResponsePirateChat?: {
    associatedUserMessageId: string;
    contentBlockDeltaIndex?: number | null;
    contentBlockDoneAtIndex?: number | null;
    contentBlockIndex?: number | null;
    contentBlockText?: string | null;
    contentBlockToolUse?: {
      input: string;
      name: string;
      toolUseId: string;
    } | null;
    conversationId: string;
    errors?: Array<{
      errorType: string;
      message: string;
    } | null> | null;
    id: string;
    owner?: string | null;
    stopReason?: string | null;
    p?: string | null;
  } | null;
};

export type OnCreateConversationMessageDisabledModelChatSubscriptionVariables = {
  filter?: ModelSubscriptionConversationMessageDisabledModelChatFilterInput | null;
  owner?: string | null;
};

export type OnCreateConversationMessageDisabledModelChatSubscription = {
  onCreateConversationMessageDisabledModelChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

export type OnCreateConversationMessagePirateChatSubscriptionVariables = {
  filter?: ModelSubscriptionConversationMessagePirateChatFilterInput | null;
  owner?: string | null;
};

export type OnCreateConversationMessagePirateChatSubscription = {
  onCreateConversationMessagePirateChat?: {
    aiContext?: string | null;
    associatedUserMessageId?: string | null;
    content?: Array<{
      document?: {
        format: string;
        name: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      image?: {
        format: string;
        source: {
          bytes?: string | null;
        };
      } | null;
      text?: string | null;
      toolResult?: {
        content: Array<{
          document?: {
            format: string;
            name: string;
          } | null;
          image?: {
            format: string;
          } | null;
          json?: string | null;
          text?: string | null;
        }>;
        status?: string | null;
        toolUseId: string;
      } | null;
      toolUse?: {
        input: string;
        name: string;
        toolUseId: string;
      } | null;
    } | null> | null;
    conversation?: {
      createdAt: string;
      id: string;
      messages?: {
        items: Array<{
          aiContext?: string | null;
          associatedUserMessageId?: string | null;
          content?: Array<{
            text?: string | null;
          } | null> | null;
          conversation?: {
            createdAt: string;
            id: string;
            metadata?: string | null;
            name?: string | null;
            owner?: string | null;
            updatedAt: string;
          } | null;
          conversationId: string;
          createdAt: string;
          id: string;
          owner?: string | null;
          role?: AmplifyAIConversationParticipantRole | null;
          toolConfiguration?: {} | null;
          updatedAt: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
    conversationId: string;
    createdAt: string;
    id: string;
    owner?: string | null;
    role?: AmplifyAIConversationParticipantRole | null;
    toolConfiguration?: {
      tools?: Array<{
        toolSpec?: {
          description?: string | null;
          inputSchema: {
            json?: string | null;
          };
          name: string;
        } | null;
      } | null> | null;
    } | null;
    updatedAt: string;
  } | null;
};

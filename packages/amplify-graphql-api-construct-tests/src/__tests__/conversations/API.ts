/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type ConversationMessagePirateChat = {
  __typename: 'ConversationMessagePirateChat';
  aiContext?: string | null;
  assistantContent?: Array<ContentBlock | null> | null;
  content?: Array<ContentBlock | null> | null;
  conversation?: ConversationPirateChat | null;
  conversationId: string;
  createdAt: string;
  id: string;
  owner?: string | null;
  role?: ConversationParticipantRole | null;
  toolConfiguration?: ToolConfiguration | null;
  updatedAt: string;
};

export type ConversationMessage = {
  __typename: 'ConversationMessage';
  aiContext?: string | null;
  content?: Array<ContentBlock | null> | null;
  conversationId: string;
  createdAt?: string | null;
  id: string;
  owner?: string | null;
  role?: ConversationParticipantRole | null;
  toolConfiguration?: ToolConfiguration | null;
  updatedAt?: string | null;
};

export type ContentBlock = {
  __typename: 'ContentBlock';
  document?: DocumentBlock | null;
  image?: ImageBlock | null;
  text?: string | null;
  toolResult?: ToolResultBlock | null;
  toolUse?: ToolUseBlock | null;
};

export type DocumentBlock = {
  __typename: 'DocumentBlock';
  format: string;
  name: string;
  source: DocumentBlockSource;
};

export type DocumentBlockSource = {
  __typename: 'DocumentBlockSource';
  bytes?: string | null;
};

export type ImageBlock = {
  __typename: 'ImageBlock';
  format: string;
  source: ImageBlockSource;
};

export type ImageBlockSource = {
  __typename: 'ImageBlockSource';
  bytes?: string | null;
};

export type ToolResultBlock = {
  __typename: 'ToolResultBlock';
  content: Array<ToolResultContentBlock>;
  status?: string | null;
  toolUseId: string;
};

export type ToolResultContentBlock = {
  __typename: 'ToolResultContentBlock';
  document?: DocumentBlock | null;
  image?: ImageBlock | null;
  json?: string | null;
  text?: string | null;
};

export type ToolUseBlock = {
  __typename: 'ToolUseBlock';
  input: string;
  name: string;
  toolUseId: string;
};

export type ConversationPirateChat = {
  __typename: 'ConversationPirateChat';
  createdAt: string;
  id: string;
  messages?: ModelConversationMessagePirateChatConnection | null;
  metadata?: string | null;
  name?: string | null;
  owner?: string | null;
  updatedAt: string;
};

export type ModelConversationMessagePirateChatConnection = {
  __typename: 'ModelConversationMessagePirateChatConnection';
  items: Array<ConversationMessagePirateChat | null>;
  nextToken?: string | null;
};

export enum ConversationParticipantRole {
  assistant = 'assistant',
  user = 'user',
}

export type ToolConfiguration = {
  __typename: 'ToolConfiguration';
  tools?: Array<Tool | null> | null;
};

export type Tool = {
  __typename: 'Tool';
  toolSpec?: ToolSpecification | null;
};

export type ToolSpecification = {
  __typename: 'ToolSpecification';
  description?: string | null;
  inputSchema: ToolInputSchema;
  name: string;
};

export type ToolInputSchema = {
  __typename: 'ToolInputSchema';
  json?: string | null;
};

export type ModelConversationMessagePirateChatFilterInput = {
  aiContext?: ModelStringInput | null;
  and?: Array<ModelConversationMessagePirateChatFilterInput | null> | null;
  conversationId?: ModelIDInput | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  not?: ModelConversationMessagePirateChatFilterInput | null;
  or?: Array<ModelConversationMessagePirateChatFilterInput | null> | null;
  owner?: ModelStringInput | null;
  role?: ModelConversationParticipantRoleInput | null;
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

export type ModelConversationParticipantRoleInput = {
  eq?: ConversationParticipantRole | null;
  ne?: ConversationParticipantRole | null;
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
  __typename: 'ModelConversationPirateChatConnection';
  items: Array<ConversationPirateChat | null>;
  nextToken?: string | null;
};

export type CreateConversationMessagePirateChatAssistantInput = {
  associatedUserMessageId?: string | null;
  content?: Array<ContentBlockInput | null> | null;
  conversationId?: string | null;
};

export type ContentBlockInput = {
  document?: DocumentBlockInput | null;
  image?: ImageBlockInput | null;
  text?: string | null;
  toolResult?: ToolResultBlockInput | null;
  toolUse?: ToolUseBlockInput | null;
};

export type DocumentBlockInput = {
  format: string;
  name: string;
  source: DocumentBlockSourceInput;
};

export type DocumentBlockSourceInput = {
  bytes?: string | null;
};

export type ImageBlockInput = {
  format: string;
  source: ImageBlockSourceInput;
};

export type ImageBlockSourceInput = {
  bytes?: string | null;
};

export type ToolResultBlockInput = {
  content: Array<ToolResultContentBlockInput>;
  status?: string | null;
  toolUseId: string;
};

export type ToolResultContentBlockInput = {
  document?: DocumentBlockInput | null;
  image?: ImageBlockInput | null;
  json?: string | null;
  text?: string | null;
};

export type ToolUseBlockInput = {
  input: string;
  name: string;
  toolUseId: string;
};

export type ModelConversationMessagePirateChatConditionInput = {
  aiContext?: ModelStringInput | null;
  and?: Array<ModelConversationMessagePirateChatConditionInput | null> | null;
  conversationId?: ModelIDInput | null;
  createdAt?: ModelStringInput | null;
  not?: ModelConversationMessagePirateChatConditionInput | null;
  or?: Array<ModelConversationMessagePirateChatConditionInput | null> | null;
  owner?: ModelStringInput | null;
  role?: ModelConversationParticipantRoleInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateConversationMessagePirateChatInput = {
  aiContext?: string | null;
  assistantContent?: Array<ContentBlockInput | null> | null;
  content?: Array<ContentBlockInput | null> | null;
  conversationId: string;
  id?: string | null;
  role?: ConversationParticipantRole | null;
  toolConfiguration?: ToolConfigurationInput | null;
};

export type ToolConfigurationInput = {
  tools?: Array<ToolInput | null> | null;
};

export type ToolInput = {
  toolSpec?: ToolSpecificationInput | null;
};

export type ToolSpecificationInput = {
  description?: string | null;
  inputSchema: ToolInputSchemaInput;
  name: string;
};

export type ToolInputSchemaInput = {
  json?: string | null;
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

export type DeleteConversationMessagePirateChatInput = {
  id: string;
};

export type DeleteConversationPirateChatInput = {
  id: string;
};

export type ModelSubscriptionConversationMessagePirateChatFilterInput = {
  aiContext?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionConversationMessagePirateChatFilterInput | null> | null;
  conversationId?: ModelSubscriptionIDInput | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionIDInput | null;
  or?: Array<ModelSubscriptionConversationMessagePirateChatFilterInput | null> | null;
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

export type GetConversationMessagePirateChatQueryVariables = {
  id: string;
};

export type GetConversationMessagePirateChatQuery = {
  getConversationMessagePirateChat?: {
    __typename: 'ConversationMessagePirateChat';
    aiContext?: string | null;
    assistantContent?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    content?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    conversation?: {
      __typename: 'ConversationPirateChat';
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
    role?: ConversationParticipantRole | null;
    toolConfiguration?: {
      __typename: 'ToolConfiguration';
    } | null;
    updatedAt: string;
  } | null;
};

export type GetConversationPirateChatQueryVariables = {
  id: string;
};

export type GetConversationPirateChatQuery = {
  getConversationPirateChat?: {
    __typename: 'ConversationPirateChat';
    createdAt: string;
    id: string;
    messages?: {
      __typename: 'ModelConversationMessagePirateChatConnection';
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type ListConversationMessagePirateChatsQueryVariables = {
  filter?: ModelConversationMessagePirateChatFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListConversationMessagePirateChatsQuery = {
  listConversationMessagePirateChats?: {
    __typename: 'ModelConversationMessagePirateChatConnection';
    items: Array<{
      __typename: 'ConversationMessagePirateChat';
      aiContext?: string | null;
      conversationId: string;
      createdAt: string;
      id: string;
      owner?: string | null;
      role?: ConversationParticipantRole | null;
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
    __typename: 'ModelConversationPirateChatConnection';
    items: Array<{
      __typename: 'ConversationPirateChat';
      createdAt: string;
      id: string;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type CreateAssistantResponsePirateChatMutationVariables = {
  input: CreateConversationMessagePirateChatAssistantInput;
};

export type CreateAssistantResponsePirateChatMutation = {
  createAssistantResponsePirateChat?: {
    __typename: 'ConversationMessagePirateChat';
    aiContext?: string | null;
    assistantContent?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    content?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    conversation?: {
      __typename: 'ConversationPirateChat';
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
    role?: ConversationParticipantRole | null;
    toolConfiguration?: {
      __typename: 'ToolConfiguration';
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
    __typename: 'ConversationMessagePirateChat';
    aiContext?: string | null;
    assistantContent?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    content?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    conversation?: {
      __typename: 'ConversationPirateChat';
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
    role?: ConversationParticipantRole | null;
    toolConfiguration?: {
      __typename: 'ToolConfiguration';
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
    __typename: 'ConversationPirateChat';
    createdAt: string;
    id: string;
    messages?: {
      __typename: 'ModelConversationMessagePirateChatConnection';
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type DeleteConversationMessagePirateChatMutationVariables = {
  condition?: ModelConversationMessagePirateChatConditionInput | null;
  input: DeleteConversationMessagePirateChatInput;
};

export type DeleteConversationMessagePirateChatMutation = {
  deleteConversationMessagePirateChat?: {
    __typename: 'ConversationMessagePirateChat';
    aiContext?: string | null;
    assistantContent?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    content?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    conversation?: {
      __typename: 'ConversationPirateChat';
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
    role?: ConversationParticipantRole | null;
    toolConfiguration?: {
      __typename: 'ToolConfiguration';
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
    __typename: 'ConversationPirateChat';
    createdAt: string;
    id: string;
    messages?: {
      __typename: 'ModelConversationMessagePirateChatConnection';
      nextToken?: string | null;
    } | null;
    metadata?: string | null;
    name?: string | null;
    owner?: string | null;
    updatedAt: string;
  } | null;
};

export type PirateChatMutationVariables = {
  aiContext?: string | null;
  content?: Array<ContentBlockInput | null> | null;
  conversationId: string;
  toolConfiguration?: ToolConfigurationInput | null;
};

export type PirateChatMutation = {
  pirateChat: {
    __typename: 'ConversationMessagePirateChat';
    aiContext?: string | null;
    content?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    conversationId: string;
    createdAt?: string | null;
    id: string;
    owner?: string | null;
    role?: ConversationParticipantRole | null;
    toolConfiguration?: {
      __typename: 'ToolConfiguration';
    } | null;
    updatedAt?: string | null;
    assistantContent?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    conversation?: {
      __typename: 'ConversationPirateChat';
      createdAt: string;
      id: string;
      metadata?: string | null;
      name?: string | null;
      owner?: string | null;
      updatedAt: string;
    } | null;
  } | null;
};

export type OnCreateAssistantResponsePirateChatSubscriptionVariables = {
  conversationId?: string | null;
};

export type OnCreateAssistantResponsePirateChatSubscription = {
  onCreateAssistantResponsePirateChat?: {
    __typename: 'ConversationMessagePirateChat';
    aiContext?: string | null;
    assistantContent?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    content?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    conversation?: {
      __typename: 'ConversationPirateChat';
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
    role?: ConversationParticipantRole | null;
    toolConfiguration?: {
      __typename: 'ToolConfiguration';
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
    __typename: 'ConversationMessagePirateChat';
    aiContext?: string | null;
    assistantContent?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    content?: Array<{
      __typename: 'ContentBlock';
      text?: string | null;
    } | null> | null;
    conversation?: {
      __typename: 'ConversationPirateChat';
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
    role?: ConversationParticipantRole | null;
    toolConfiguration?: {
      __typename: 'ToolConfiguration';
    } | null;
    updatedAt: string;
  } | null;
};

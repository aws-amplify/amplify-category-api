import { AppSyncGraphqlResponse, doAppSyncGraphqlOperation, doAppSyncGraphqlQuery } from '../../utils';
import {
  AmplifyAIContentBlockInput,
  CreateConversationDisabledModelChatMutation,
  CreateConversationPirateChatMutation,
  DisabledModelChatMutation,
  GetConversationPirateChatQuery,
  ListConversationMessagePirateChatsQuery,
  ListConversationPirateChatsQuery,
  PirateChatMutation,
  AmplifyAIToolConfigurationInput,
  UpdateConversationPirateChatMutation,
} from './API';
import {
  createConversationDisabledModelChat,
  createConversationPirateChat,
  disabledModelChat,
  pirateChat,
  updateConversationPirateChat,
} from './graphql/mutations';
import { getConversationPirateChat, listConversationMessagePirateChats, listConversationPirateChats } from './graphql/queries';

export const doCreateConversationPirateChat = async (
  apiEndpoint: string,
  accessToken: string,
): Promise<AppSyncGraphqlResponse<CreateConversationPirateChatMutation>> => {
  return doAppSyncGraphqlOperation({
    apiEndpoint,
    auth: { accessToken: accessToken },
    query: createConversationPirateChat,
    variables: { input: { name: 'test conversation' } },
  });
};

export const doCreateConversationDisabledModelChat = async (
  apiEndpoint: string,
  accessToken: string,
): Promise<AppSyncGraphqlResponse<CreateConversationDisabledModelChatMutation>> => {
  return doAppSyncGraphqlOperation({
    apiEndpoint,
    auth: { accessToken: accessToken },
    query: createConversationDisabledModelChat,
    variables: { input: { name: 'test conversation' } },
  });
};

export const doGetConversationPirateChat = async (
  apiEndpoint: string,
  accessToken: string,
  conversationId: string,
): Promise<AppSyncGraphqlResponse<GetConversationPirateChatQuery>> => {
  return doAppSyncGraphqlQuery({
    apiEndpoint,
    auth: { accessToken: accessToken },
    query: getConversationPirateChat,
    variables: {
      id: conversationId,
    },
  });
};

export const doListConversationsPirateChat = async (
  apiEndpoint: string,
  accessToken: string,
): Promise<AppSyncGraphqlResponse<ListConversationPirateChatsQuery>> => {
  return doAppSyncGraphqlQuery({
    apiEndpoint,
    auth: { accessToken: accessToken },
    query: listConversationPirateChats,
  });
};

export const doUpdateConversationPirateChat = async (
  apiEndpoint: string,
  accessToken: string,
  conversationId: string,
  name: string,
): Promise<AppSyncGraphqlResponse<UpdateConversationPirateChatMutation>> => {
  return doAppSyncGraphqlOperation({
    apiEndpoint,
    auth: { accessToken: accessToken },
    query: updateConversationPirateChat,
    variables: { input: { id: conversationId, name } },
  });
};

export const doSendMessagePirateChat = async (input: {
  apiEndpoint: string;
  accessToken: string;
  conversationId: string;
  content: AmplifyAIContentBlockInput[];
  toolConfiguration?: AmplifyAIToolConfigurationInput;
}): Promise<AppSyncGraphqlResponse<PirateChatMutation>> => {
  const { apiEndpoint, accessToken, conversationId, content, toolConfiguration } = input;
  return doAppSyncGraphqlOperation({
    apiEndpoint,
    auth: { accessToken },
    query: pirateChat,
    variables: {
      conversationId,
      content,
      toolConfiguration,
    },
  });
};

export const doSendMessageDisabledModelChat = async (input: {
  apiEndpoint: string;
  accessToken: string;
  conversationId: string;
  content: AmplifyAIContentBlockInput[];
  toolConfiguration?: AmplifyAIToolConfigurationInput;
}): Promise<AppSyncGraphqlResponse<DisabledModelChatMutation>> => {
  const { apiEndpoint, accessToken, conversationId, content, toolConfiguration } = input;
  return doAppSyncGraphqlOperation({
    apiEndpoint,
    auth: { accessToken },
    query: disabledModelChat,
    variables: {
      conversationId,
      content,
      toolConfiguration,
    },
  });
};

export const doListConversationMessagesPirateChat = async (
  apiEndpoint: string,
  accessToken: string,
  conversationId: string,
): Promise<AppSyncGraphqlResponse<ListConversationMessagePirateChatsQuery>> => {
  return doAppSyncGraphqlQuery({
    apiEndpoint,
    auth: { accessToken: accessToken },
    query: listConversationMessagePirateChats,
    variables: {
      filter: {
        conversationId: { eq: conversationId },
      },
    },
  });
};

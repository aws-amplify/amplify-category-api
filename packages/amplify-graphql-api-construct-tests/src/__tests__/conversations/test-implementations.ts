import { AppSyncGraphqlResponse, doAppSyncGraphqlMutation, doAppSyncGraphqlOperation, doAppSyncGraphqlQuery } from '../../utils';
import {
  CreateConversationPirateChatMutation,
  GetConversationPirateChatQuery,
  ListConversationMessagePirateChatsQuery,
  PirateChatMutation,
} from './API';
import { createConversationPirateChat, pirateChat } from './graphql/mutations';
import { getConversationPirateChat, listConversationMessagePirateChats } from './graphql/queries';

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

export const doSendMessagePirateChat = async (
  apiEndpoint: string,
  accessToken: string,
  conversationId: string,
  content: { text: string }[],
): Promise<AppSyncGraphqlResponse<PirateChatMutation>> => {
  return doAppSyncGraphqlOperation({
    apiEndpoint,
    auth: { accessToken: accessToken },
    query: pirateChat,
    variables: {
      conversationId,
      content,
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

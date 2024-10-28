/* eslint-disable import/namespace */
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as fs from 'fs-extra';
import * as path from 'path';
import { cdkDeploy, cdkDestroy, initCDKProject } from '../../commands';
import { createCognitoUser, signInCognitoUser, TestDefinition, writeStackConfig, writeTestDefinitions } from '../../utils';
import { AppSyncSubscriptionClient, consumeYields, mergeNamedAsyncIterators } from '../../utils/appsync-graphql/subscription';
import { DURATION_20_MINUTES, ONE_MINUTE } from '../../utils/duration-constants';
import { onCreateAssistantResponsePirateChat } from './graphql/subscriptions';
import {
  doCreateConversationPirateChat,
  doListConversationMessagesPirateChat,
  doSendMessagePirateChat,
  doUpdateConversationPirateChat,
} from './test-implementations';

jest.setTimeout(DURATION_20_MINUTES);

describe('conversation', () => {
  const baseProjFolderName = path.basename(__filename, '.test.ts');
  const region = process.env.CLI_REGION ?? 'us-west-2';

  describe('conversation route', () => {
    const projFolderName = `${baseProjFolderName}-model`;
    let projRoot: string;
    let accessToken: string;
    let accessToken2: string;
    let apiEndpoint: string;
    let realtimeEndpoint: string;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const { apiEndpoint: graphqlEndpoint, userPoolClientId, userPoolId } = await deployCdk(projRoot);
      apiEndpoint = graphqlEndpoint;
      realtimeEndpoint = apiEndpoint.replace('appsync-api', 'appsync-realtime-api').replace('https://', 'wss://');

      const { username: user1Username, password: user1Password } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: user1AccessToken } = await signInCognitoUser({
        username: user1Username,
        password: user1Password,
        region,
        userPoolClientId,
      });

      const { username: user2Username, password: user2Password } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: user2AccessToken } = await signInCognitoUser({
        username: user2Username,
        password: user2Password,
        region,
        userPoolClientId,
      });

      accessToken = user1AccessToken;
      accessToken2 = user2AccessToken;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }
      deleteProjectDir(projRoot);
    });

    test(
      'happy path: user creates conversation, sends message, and receives response through subscription',
      async () => {
        // create a conversation
        const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id: conversationId } = conversationResult.body.data.createConversationPirateChat;
        expect(conversationId).toBeDefined();

        // subscribe to the conversation
        const client = new AppSyncSubscriptionClient(realtimeEndpoint, apiEndpoint);
        const connection = await client.connect({ accessToken });
        const subscription = connection.subscribe({
          query: onCreateAssistantResponsePirateChat,
          variables: { conversationId },
          auth: { accessToken },
        });

        // send a message to the conversation
        const sendMessageResult = await doSendMessagePirateChat(apiEndpoint, accessToken, conversationId, [{ text: 'Hello, world!' }]);
        const message = sendMessageResult.body.data?.pirateChat;
        expect(message).toBeDefined();
        expect(message.content).toHaveLength(1);
        expect(message.content[0].text).toEqual('Hello, world!');
        expect(message.conversationId).toEqual(conversationId);

        // expect to receive the assistant response in the subscription
        for await (const event of subscription) {
          expect(event.onCreateAssistantResponsePirateChat.conversationId).toEqual(conversationId);
          expect(event.onCreateAssistantResponsePirateChat.content).toHaveLength(1);
          expect(event.onCreateAssistantResponsePirateChat.content[0].text).toBeDefined();
          expect(event.onCreateAssistantResponsePirateChat.role).toEqual('assistant');
          break;
        }
      },
      ONE_MINUTE,
    );

    test('update conversation', async () => {
      // create a conversation
      const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);

      const { id } = conversationResult.body.data.createConversationPirateChat;
      expect(id).toBeDefined();

      // update the conversation
      const updateConversationResult = await doUpdateConversationPirateChat(apiEndpoint, accessToken, id, 'updated conversation name');

      const updatedConversation = updateConversationResult.body.data.updateConversationPirateChat;
      const { name, id: updatedId } = updatedConversation;
      // expect the name to be updated
      expect(name).toEqual('updated conversation name');
      // expect the id to be the same
      expect(updatedId).toEqual(id);
    });

    describe('conversation owner auth negative tests', () => {
      test('user2 cannot send message to user1s conversation', async () => {
        // user1 creates a conversation
        const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id } = conversationResult.body.data.createConversationPirateChat;

        // user2 attempts to send a message to the conversation
        const sendMessageResult = await doSendMessagePirateChat(apiEndpoint, accessToken2, id, [{ text: 'Hello, world!' }]);

        // expect the response data to be null
        expect(sendMessageResult.body.data.pirateChat).toBeNull();
        const sendMessageErrors = sendMessageResult.body.errors;

        // expect there to be a `ResourceNotFound` error
        expect(sendMessageErrors).toHaveLength(1);
        expect(sendMessageErrors[0].errorType).toEqual('ResourceNotFound');
      });

      test('user2 cannot read user1s conversation history', async () => {
        // user1 creates a conversation
        const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id } = conversationResult.body.data.createConversationPirateChat;

        // user1 sends a message to the conversation
        const sendMessageResult = await doSendMessagePirateChat(apiEndpoint, accessToken, id, [{ text: 'Hello, world!' }]);
        const message = sendMessageResult.body.data.pirateChat;
        expect(message).toBeDefined();
        expect(message.content).toHaveLength(1);
        expect(message.content[0].text).toEqual('Hello, world!');
        expect(message.conversationId).toEqual(id);

        // user1 should be able to read the conversation history
        const messages = await doListConversationMessagesPirateChat(apiEndpoint, accessToken, id);
        expect(messages.body.data.listConversationMessagePirateChats.items).toHaveLength(1);
        expect(messages.body.data.listConversationMessagePirateChats.items[0].conversationId).toBe(id);

        // user2 should not be able to read the conversation history
        const messagesB = await doListConversationMessagesPirateChat(apiEndpoint, accessToken2, id);
        expect(messagesB.body.data.listConversationMessagePirateChats.items).toHaveLength(0);
      });

      test('user does not receive events from another user\'s conversation', async () => {
        // user1 creates a conversation
        const user1ConversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id: user1ConversationId } = user1ConversationResult.body.data.createConversationPirateChat;

        // user2 creates a conversation
        const user2ConversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken2);
        const { id: user2ConversationId } = user2ConversationResult.body.data.createConversationPirateChat;

        // user1 opens a connection
        const user1Connection = await new AppSyncSubscriptionClient(realtimeEndpoint, apiEndpoint).connect({ accessToken });

        // user2 opens a connection
        const user2Connection = await new AppSyncSubscriptionClient(realtimeEndpoint, apiEndpoint).connect({ accessToken: accessToken2 });

        // user1 subscribes to user1's conversation
        const user1SubscriptionForUser1Conversation = user1Connection.subscribe({
          query: onCreateAssistantResponsePirateChat,
          variables: { conversationId: user1ConversationId },
          auth: { accessToken },
        });

        // user1 subscribes to user2's conversation
        const user1SubscriptionForUser2Conversation = user1Connection.subscribe({
          query: onCreateAssistantResponsePirateChat,
          variables: { conversationId: user2ConversationId },
          auth: { accessToken },
        });

        // user2 subscribes to user2's conversation
        const user2SubscriptionForUser2Conversation = user2Connection.subscribe({
          query: onCreateAssistantResponsePirateChat,
          variables: { conversationId: user2ConversationId },
          auth: { accessToken: accessToken2 },
        });

        // user2 subscribes to user1's conversation
        const user2SubscriptionForUser1Conversation = user2Connection.subscribe({
          query: onCreateAssistantResponsePirateChat,
          variables: { conversationId: user1ConversationId },
          auth: { accessToken: accessToken2 },
        });

        // merge the subscription streams into a single stream
        const mergedSubscriptionStream = mergeNamedAsyncIterators(
          // these should not receive any events
          ['user1-user2', user1SubscriptionForUser2Conversation],
          ['user2-user1', user2SubscriptionForUser1Conversation],
          // these should receive events
          ['user1-user1', user1SubscriptionForUser1Conversation],
          ['user2-user2', user2SubscriptionForUser2Conversation],
        );

        // user1 sends message to user1's conversation
        await doSendMessagePirateChat(apiEndpoint, accessToken, user1ConversationId, [{ text: 'Hello, world!' }]);

        // user2 sends message to user2's conversation
        await doSendMessagePirateChat(apiEndpoint, accessToken2, user2ConversationId, [{ text: 'Hello, world!' }]);

        // consume two events from the merged stream
        const events = await consumeYields(mergedSubscriptionStream, 2);

        events.forEach(([name, value]) => {
          switch (name) {
            case 'user1-user2':
            case 'user2-user1':
              throw new Error(`subscription event received by wrong user. Name: ${name}. Event: ${JSON.stringify(value, null, 2)}`);
            case 'user1-user1':
              expect(value.onCreateAssistantResponsePirateChat.conversationId).toEqual(user1ConversationId);
              break;
            case 'user2-user2':
              expect(value.onCreateAssistantResponsePirateChat.conversationId).toEqual(user2ConversationId);
              break;
          }
        });
      },
      ONE_MINUTE,
    );
  });
});

const deployCdk = async (projRoot: string): Promise<{ apiEndpoint: string; userPoolClientId: string; userPoolId: string }> => {
  const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'configurable-stack'));
  const name = await initCDKProject(projRoot, templatePath, {
    additionalDependencies: ['esbuild'],
  });

  const conversationSchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-conversation.graphql'));
  const conversationSchema = fs.readFileSync(conversationSchemaPath).toString();

  const testDefinitions: Record<string, TestDefinition> = {
    conversation: {
      schema: [conversationSchema].join('\n'),
      strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    },
  };

  writeStackConfig(projRoot, { prefix: 'Conversation' });
  writeTestDefinitions(testDefinitions, projRoot);

  const outputs = await cdkDeploy(projRoot, '--all');
  const { awsAppsyncApiEndpoint, UserPoolClientId, UserPoolId } = outputs[name];
  return { apiEndpoint: awsAppsyncApiEndpoint, userPoolClientId: UserPoolClientId, userPoolId: UserPoolId };
};

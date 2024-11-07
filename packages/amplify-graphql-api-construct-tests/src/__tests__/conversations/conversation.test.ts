/* eslint-disable import/namespace */
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as fs from 'fs-extra';
import * as path from 'path';
import { cdkDeploy, cdkDestroy, initCDKProject } from '../../commands';
import { createCognitoUser, signInCognitoUser, TestDefinition, writeStackConfig, writeTestDefinitions } from '../../utils';
import { AppSyncSubscriptionClient, mergeNamedAsyncIterators } from '../../utils/appsync-graphql/subscription';
import { DURATION_20_MINUTES, DURATION_5_MINUTES, ONE_MINUTE } from '../../utils/duration-constants';
import {
  ContentBlock,
  ConversationMessageStreamPart,
  OnCreateAssistantResponsePirateChatSubscription,
  ToolConfigurationInput,
} from './API';
import { onCreateAssistantResponseDisabledModelChat, onCreateAssistantResponsePirateChat } from './graphql/subscriptions';
import {
  doCreateConversationDisabledModelChat,
  doCreateConversationPirateChat,
  doGetConversationPirateChat,
  doListConversationMessagesPirateChat,
  doSendMessageDisabledModelChat,
  doListConversationsPirateChat,
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
      'happy path: user creates conversation, sends message, receives response through subscription, conversation updatedAt is updated',
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
        const sendMessageResult = await doSendMessagePirateChat({
          apiEndpoint,
          accessToken,
          conversationId,
          content: [{ text: 'Hello, world!' }],
        });
        const message = sendMessageResult.body.data?.pirateChat;
        expect(message).toBeDefined();
        expect(message.content).toHaveLength(1);
        expect(message.content[0].text).toEqual('Hello, world!');
        expect(message.conversationId).toEqual(conversationId);

        const events: ConversationMessageStreamPart[] = [];
        // expect to receive the assistant response in the subscription
        for await (const event of subscription) {
          events.push(event.onCreateAssistantResponsePirateChat);
          if (event.onCreateAssistantResponsePirateChat.stopReason) break;
        }

        // reconstruct the message from the events
        const sortedEvents = events
          .filter((event) => event.contentBlockText)
          .sort((a, b) => a.contentBlockDeltaIndex - b.contentBlockDeltaIndex);
        const contentBlockText = sortedEvents.map((event) => event.contentBlockText).join('');

        // list messages to get the full assistant message
        const listMessagesResult = await doListConversationMessagesPirateChat(apiEndpoint, accessToken, conversationId);
        const messages = listMessagesResult.body.data.listConversationMessagePirateChats.items;
        expect(messages).toHaveLength(2);

        // assert that the received assistant message matches the message reconstructed from the events.
        const assistantMessage = messages.find((message) => message.role === 'assistant');
        expect(assistantMessage).toBeDefined();
        expect(assistantMessage.content).toHaveLength(1);
        expect(assistantMessage.content[0].text).toEqual(contentBlockText);

        // assert that the conversation updatedAt field is updated to the user message createdAt field
        const conversation = await doGetConversationPirateChat(apiEndpoint, accessToken, conversationId);
        expect(conversation.body.data.getConversationPirateChat.updatedAt).toBeDefined();
        expect(conversation.body.data.getConversationPirateChat.updatedAt).toEqual(message.createdAt);
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

    test(
      'list conversation messages ordered by createdAt',
      async () => {
        // create a conversation
        const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id: conversationId } = conversationResult.body.data.createConversationPirateChat;

        // subscribe to the conversation
        const client = new AppSyncSubscriptionClient(realtimeEndpoint, apiEndpoint);
        const connection = await client.connect({ accessToken });
        const subscription = connection.subscribe({
          query: onCreateAssistantResponsePirateChat,
          variables: { conversationId },
          auth: { accessToken },
        });

        // send messages to the conversation
        await doSendMessagePirateChat({
          apiEndpoint,
          accessToken,
          conversationId,
          content: [{ text: 'tell me something interesting about the ocean. keep it less than 100 characters.' }],
        });

        // wait for the assistant response
        for await (const event of subscription) {
          if (event.onCreateAssistantResponsePirateChat.stopReason) break;
        }

        await doSendMessagePirateChat({
          apiEndpoint,
          accessToken,
          conversationId,
          content: [{ text: 'tell me more. again less than 100 characters.' }],
        });

        // wait for the second assistant response
        for await (const event of subscription) {
          if (event.onCreateAssistantResponsePirateChat.stopReason) break;
        }

        // list messages to get the full assistant message
        const listMessagesResult = await doListConversationMessagesPirateChat(apiEndpoint, accessToken, conversationId);
        const messages = listMessagesResult.body.data.listConversationMessagePirateChats.items;
        expect(messages.length).toBeGreaterThanOrEqual(4);
        const createdAts = messages.map((message) => message.createdAt);
        expect(createdAts).toEqual([...createdAts].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()));
      },
      ONE_MINUTE,
    );

    test('list conversations ordered by updatedAt', async () => {
      // create conversations
      await doCreateConversationPirateChat(apiEndpoint, accessToken);
      await doCreateConversationPirateChat(apiEndpoint, accessToken);
      await doCreateConversationPirateChat(apiEndpoint, accessToken);
      await doCreateConversationPirateChat(apiEndpoint, accessToken);
      await doCreateConversationPirateChat(apiEndpoint, accessToken);

      // list conversations
      const listConversationsResult = await doListConversationsPirateChat(apiEndpoint, accessToken);
      const conversations = listConversationsResult.body.data.listConversationPirateChats.items;
      // there's likely already more conversations due to other tests running in parallel.
      expect(conversations.length).toBeGreaterThanOrEqual(5);
      const updatedAts = conversations.map((conversation) => conversation.updatedAt);
      expect(updatedAts).toEqual([...updatedAts].sort((a, b) => new Date(b).getTime() - new Date(a).getTime()));
    });

    test(
      'client tool usage',
      async () => {
        // create a conversation
        const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id: conversationId } = conversationResult.body.data.createConversationPirateChat;

        // subscribe to the conversation
        const client = new AppSyncSubscriptionClient(realtimeEndpoint, apiEndpoint);
        const connection = await client.connect({ accessToken });
        const subscription = connection.subscribe({
          query: onCreateAssistantResponsePirateChat,
          variables: { conversationId },
          auth: { accessToken },
        });

        // define the client tool configuration
        const toolConfiguration: ToolConfigurationInput = {
          tools: [
            {
              toolSpec: {
                name: 'GetWeather',
                description: 'Get the temperature for a given location.',
                inputSchema: {
                  json: JSON.stringify({
                    type: 'object',
                    properties: {
                      city: {
                        type: 'string',
                      },
                    },
                    required: ['city'],
                  }),
                },
              },
            },
          ],
        };

        // send a message to with the tool configuration and a message that triggers to tool.
        const sendMessageResult = await doSendMessagePirateChat({
          apiEndpoint,
          accessToken,
          conversationId,
          content: [{ text: 'What should I wear in Charleston, SC today?' }],
          toolConfiguration,
        });

        // assert that the returned user message has the expected values.
        const message1 = sendMessageResult.body.data.pirateChat;
        expect(message1).toBeDefined();
        expect(message1.content).toHaveLength(1);
        expect(message1.content[0].text).toEqual('What should I wear in Charleston, SC today?');
        expect(message1.conversationId).toEqual(conversationId);
        expect(message1.toolConfiguration).toEqual(toolConfiguration);

        // expect to receive the assistant response including a toolUse block in the subscription
        const events: ConversationMessageStreamPart[] = [];
        for await (const event of subscription) {
          events.push(event.onCreateAssistantResponsePirateChat);
          if (event.onCreateAssistantResponsePirateChat.stopReason) break;
        }

        // assert that the event has the expected toolUse block
        const eventWithToolUse = events.find((event) => event.contentBlockToolUse);
        expect(eventWithToolUse).toBeDefined();
        expect(eventWithToolUse.contentBlockToolUse.name).toEqual('GetWeather');
        expect(eventWithToolUse.contentBlockToolUse.toolUseId).toBeDefined();
        const parsedInput = JSON.parse(eventWithToolUse.contentBlockToolUse.input);
        expect(parsedInput.city).toMatch(/charleston/i);

        // send a message with the tool result
        const toolResultContent = { temperature: 82, unit: 'F' };
        const sendMessageResult2 = await doSendMessagePirateChat({
          apiEndpoint,
          accessToken,
          conversationId,
          content: [
            {
              toolResult: {
                content: [{ json: JSON.stringify(toolResultContent) }],
                status: 'success',
                toolUseId: eventWithToolUse.contentBlockToolUse.toolUseId,
              },
            },
          ],
          toolConfiguration,
        });

        // assert that the returned user message has the expected values.
        const message2 = sendMessageResult2.body.data.pirateChat;
        expect(message2).toBeDefined();
        expect(message2.content).toHaveLength(1);
        expect(message2.content[0].toolResult.toolUseId).toEqual(eventWithToolUse.contentBlockToolUse.toolUseId);
        expect(message2.content[0].toolResult.content[0].json).toEqual(JSON.stringify(toolResultContent));

        // expect to receive the assistant response in the subscription
        for await (const event of subscription) {
          events.push(event.onCreateAssistantResponsePirateChat);
          if (event.onCreateAssistantResponsePirateChat.stopReason) break;
        }

        // list messages to get the full assistant message
        const listMessagesResult = await doListConversationMessagesPirateChat(apiEndpoint, accessToken, conversationId);
        const messages = listMessagesResult.body.data.listConversationMessagePirateChats.items;
        expect(messages).toHaveLength(4);

        // assert that the assistant responses from the list query match the message reconstructed from the events.
        const assistantResponseFromListQueryMessage1 = messages.find((message) => message.associatedUserMessageId === message1.id);
        const assistantResponseFromReconciledStreamEventsMessage1 = reconcileStreamEvents(
          events.filter((event) => event.associatedUserMessageId === message1.id),
        );
        expect(
          assistantResponseFromListQueryMessage1.content.map((contentBlock) =>
            Object.fromEntries(Object.entries(contentBlock).filter(([_, value]) => !!value)),
          ),
        ).toEqual(assistantResponseFromReconciledStreamEventsMessage1);

        const assistantResponseFromListQueryMessage2 = messages.find((message) => message.associatedUserMessageId === message2.id);
        const assistantResponseFromReconciledStreamEventsMessage2 = reconcileStreamEvents(
          events.filter((event) => event.associatedUserMessageId === message2.id),
        );
        expect(
          assistantResponseFromListQueryMessage2.content.map((contentBlock) =>
            Object.fromEntries(Object.entries(contentBlock).filter(([_, value]) => !!value)),
          ),
        ).toEqual(assistantResponseFromReconciledStreamEventsMessage2);
      },
      DURATION_5_MINUTES,
    );

    // This test requires that the model with the specified id (mistral.mistral-large-2407-v1:0) is not enabled
    // in the testing region. If the assertions fail, it is likely that the model has been enabled in the region.
    // In that case, change the model id in `schema-conversation.graphql` or use a different region.
    test(
      'disabled model error propagated from lambda through subscription',
      async () => {
        // create a conversation
        const conversationResult = await doCreateConversationDisabledModelChat(apiEndpoint, accessToken);
        const { id: conversationId } = conversationResult.body.data.createConversationDisabledModelChat;
        // subscribe to the conversation
        const client = new AppSyncSubscriptionClient(realtimeEndpoint, apiEndpoint);
        const connection = await client.connect({ accessToken });
        const subscription = connection.subscribe({
          query: onCreateAssistantResponseDisabledModelChat,
          variables: { conversationId },
          auth: { accessToken },
        });

        // send a message to the conversation
        await doSendMessageDisabledModelChat({
          apiEndpoint,
          accessToken,
          conversationId,
          content: [{ text: 'Hello, world!' }],
        });

        for await (const event of subscription) {
          expect(event.onCreateAssistantResponseDisabledModelChat.errors).toHaveLength(1);
          expect(event.onCreateAssistantResponseDisabledModelChat.errors[0].errorType).toEqual('AccessDeniedException');
          expect(event.onCreateAssistantResponseDisabledModelChat.errors[0].message).toEqual(
            "You don't have access to the model with the specified model ID.",
          );
          break;
        }
      },
      ONE_MINUTE,
    );

    describe('conversation owner auth negative tests', () => {
      test('user2 cannot list user1s conversations', async () => {
        // user1 creates a conversation
        const user1ConversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id: user1ConversationId } = user1ConversationResult.body.data.createConversationPirateChat;

        // user2 creates a conversation
        const user2ConversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken2);
        const { id: user2ConversationId } = user2ConversationResult.body.data.createConversationPirateChat;

        // user1 should be able to list their conversations
        const user1ListConversationsResult = await doListConversationsPirateChat(apiEndpoint, accessToken);
        const user1ListedConversationIds = user1ListConversationsResult.body.data.listConversationPirateChats.items.map(
          (conversation) => conversation.id,
        );
        expect(user1ListedConversationIds).toContain(user1ConversationId);
        expect(user1ListedConversationIds).not.toContain(user2ConversationId);

        // user2 attempts to list the conversations
        const user2ListConversationsResult = await doListConversationsPirateChat(apiEndpoint, accessToken2);
        const user2ListedConversationIds = user2ListConversationsResult.body.data.listConversationPirateChats.items.map(
          (conversation) => conversation.id,
        );
        expect(user2ListedConversationIds).not.toContain(user1ConversationId);
        expect(user2ListedConversationIds).toContain(user2ConversationId);
      });

      test('user2 cannot send message to user1s conversation', async () => {
        // user1 creates a conversation
        const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id } = conversationResult.body.data.createConversationPirateChat;

        // user2 attempts to send a message to the conversation
        const sendMessageResult = await doSendMessagePirateChat({
          apiEndpoint,
          accessToken: accessToken2,
          conversationId: id,
          content: [{ text: 'Hello, world!' }],
        });

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
        const sendMessageResult = await doSendMessagePirateChat({
          apiEndpoint,
          accessToken,
          conversationId: id,
          content: [{ text: 'Hello, world!' }],
        });
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

      test(
        "user does not receive events from another user's conversation",
        async () => {
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
          await doSendMessagePirateChat({
            apiEndpoint,
            accessToken,
            conversationId: user1ConversationId,
            content: [{ text: 'Hello, world!' }],
          });

          // user2 sends message to user2's conversation
          await doSendMessagePirateChat({
            apiEndpoint,
            accessToken: accessToken2,
            conversationId: user2ConversationId,
            content: [{ text: 'Hello, world!' }],
          });

          // consume two assistant response streams from the merged stream
          let expectedStopReasonEvents = 2;
          let namedEvents: [string, OnCreateAssistantResponsePirateChatSubscription][] = [];
          for await (const namedEvent of mergedSubscriptionStream) {
            namedEvents.push(namedEvent);

            const [_, event] = namedEvent;
            if (event.onCreateAssistantResponsePirateChat.stopReason) expectedStopReasonEvents--;
            if (expectedStopReasonEvents === 0) break;
          }

          const unexpectedEvents = namedEvents.filter(([name]) => name === 'user1-user2' || name === 'user2-user1');
          // user1-user2 and user2-user1 subscriptions should not receive any events.
          expect(unexpectedEvents).toHaveLength(0);

          const user1SubscriptionEvents = namedEvents
            .filter(([name]) => name === 'user1-user1')
            .map(([_, event]) => event.onCreateAssistantResponsePirateChat.conversationId);

          const user2SubscriptionEvents = namedEvents
            .filter(([name]) => name === 'user2-user2')
            .map(([_, event]) => event.onCreateAssistantResponsePirateChat.conversationId);

          // user1 and user2 should receive events for their own conversations
          expect(user1SubscriptionEvents.length).toBeGreaterThan(0);
          expect(user2SubscriptionEvents.length).toBeGreaterThan(0);

          // assert that the received conversation ids from those events match the expected conversation ids
          user1SubscriptionEvents.forEach((receivedConversationId) => expect(receivedConversationId).toEqual(user1ConversationId));
          user2SubscriptionEvents.forEach((receivedConversationId) => expect(receivedConversationId).toEqual(user2ConversationId));
        },
        ONE_MINUTE,
      );
    });
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

const reconcileStreamEvents = (events: ConversationMessageStreamPart[]): ContentBlock[] => {
  return events
    .sort((a, b) => {
      let aValue = a.contentBlockIndex * 1000 + (a.contentBlockDeltaIndex || 0);
      let bValue = b.contentBlockIndex * 1000 + (b.contentBlockDeltaIndex || 0);
      return aValue - bValue;
    })
    .reduce((acc, event) => {
      if (event.contentBlockText) {
        if (acc[event.contentBlockIndex]) {
          acc[event.contentBlockIndex].text += event.contentBlockText;
        } else {
          acc[event.contentBlockIndex] = { text: event.contentBlockText };
        }
      } else if (event.contentBlockToolUse) {
        acc[event.contentBlockIndex] = { toolUse: event.contentBlockToolUse };
      }
      return acc;
    }, [] as ContentBlock[]);
};

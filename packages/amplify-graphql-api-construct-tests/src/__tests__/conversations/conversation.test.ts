/* eslint-disable import/namespace */
import * as path from 'path';
import * as fs from 'fs-extra';
import { DURATION_20_MINUTES } from '../../utils/duration-constants';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { cdkDeploy, cdkDestroy, initCDKProject } from '../../commands';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { createCognitoUser, signInCognitoUser, TestDefinition, writeStackConfig, writeTestDefinitions } from '../../utils';
import { doCreateConversationPirateChat, doListConversationMessagesPirateChat, doSendMessagePirateChat } from './test-implementations';

jest.setTimeout(DURATION_20_MINUTES);

describe('conversation', () => {
  const baseProjFolderName = path.basename(__filename, '.test.ts');
  const region = process.env.CLI_REGION ?? 'us-west-2';

  describe('conversation route', () => {
    const projFolderName = `${baseProjFolderName}-model`;
    let apiEndpoint: string;
    let projRoot: string;
    let accessToken: string;
    let accessToken2: string;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'configurable-stack'));
      const name = await initCDKProject(projRoot, templatePath);

      const conversationSchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-conversation.graphql'));
      const conversationSchema = fs.readFileSync(conversationSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        conversation: {
          schema: [conversationSchema].join('\n'),
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackConfig(projRoot, { prefix: 'Conversation', useSandbox: true });
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint, UserPoolClientId: userPoolClientId, UserPoolId: userPoolId } = outputs[name];

      apiEndpoint = awsAppsyncApiEndpoint;

      const { username: username1, password: password1 } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: newAccessToken1 } = await signInCognitoUser({
        username: username1,
        password: password1,
        region,
        userPoolClientId,
      });

      accessToken = newAccessToken1;

      const { username: username2, password: password2 } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: newAccessToken2 } = await signInCognitoUser({
        username: username2,
        password: password2,
        region,
        userPoolClientId,
      });

      accessToken2 = newAccessToken2;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }
      deleteProjectDir(projRoot);
    });

    test('happy path', async () => {
      const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
      const { id } = conversationResult.body.data.createConversationPirateChat;
      expect(id).toBeDefined();

      const sendMessageResult = await doSendMessagePirateChat(apiEndpoint, accessToken, id, [{ text: 'Hello, world!' }]);
      const message = sendMessageResult.body.data.pirateChat;
      expect(message).toBeDefined();
      expect(message.content).toEqual([{ text: 'Hello, world!' }]);
      expect(message.conversationId).toEqual(id);

      const messages = await doListConversationMessagesPirateChat(apiEndpoint, accessToken, id);
      expect(messages.body.data.listConversationMessagePirateChats.items.length).toBe(1);
      expect(messages.body.data.listConversationMessagePirateChats.items[0].conversationId).toBe(id);
    });

    describe('conversation owner auth negative tests', () => {
      test('userB cannot send message to userAs conversation', async () => {
        const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id } = conversationResult.body.data.createConversationPirateChat;

        const sendMessageResult = await doSendMessagePirateChat(apiEndpoint, accessToken2, id, [{ text: 'Hello, world!' }]);
        expect(sendMessageResult.body.data.pirateChat).toBeNull();
        const sendMessageErrors = sendMessageResult.body.errors;
        expect(sendMessageErrors.length).toBe(1);
        expect(sendMessageErrors[0].message).toContain('Conversation not found');
      });

      test('userB cannot read userAs conversation history', async () => {
        const conversationResult = await doCreateConversationPirateChat(apiEndpoint, accessToken);
        const { id } = conversationResult.body.data.createConversationPirateChat;

        const listMessages = await doListConversationMessagesPirateChat(apiEndpoint, accessToken2, id);
        expect(listMessages.body.data.listConversationMessagePirateChats.items.length).toBe(0);
        const listMessageErrors = listMessages.body.errors;
        expect(listMessageErrors.length).toBe(1);
        expect(listMessageErrors[0].message).toContain('Unauthorized');
      });
    });
  });
});

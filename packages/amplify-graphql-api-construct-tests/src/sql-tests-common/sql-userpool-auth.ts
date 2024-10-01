import * as path from 'path';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { AuthConstructStackOutputs } from '../types';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { schema as generateSchema } from '../sql-tests-common/schemas/sql-userpool-auth/userpool-auth-provider';
import { CognitoIdentityPoolCredentialsManager } from '../utils/sql-cognito-helper';
import { configureAppSyncClients, getConfiguredAppsyncClientCognitoAuth } from '../utils/appsync-model-operation/appsync-client-helper';
import {
  createModelOperationHelpers,
  checkOperationResult,
  checkListItemExistence,
} from '../utils/appsync-model-operation/model-operation-helper';
import { ONE_MINUTE } from '../utils/duration-constants';
import { authConstructDependency } from '../__tests__/additional-dependencies';

export const testGraphQLAPIWithUserPoolAccess = (
  options: {
    projFolderName: string;
    region: string;
    connectionConfigName: string;
    dbController: SqlDatatabaseController;
  },
  testBlockDescription: string,
  engine: ImportedRDSType,
): void => {
  describe(`${testBlockDescription} - ${engine}`, () => {
    const schema = generateSchema(engine);
    const userPoolProvider = 'userPools';
    const userMap = {};
    const userName1 = 'user1@amazon.com';
    const userName2 = 'user2@amazon.com';
    const password = 'Password1234!';

    let projRoot;
    let region;
    let dbController: SqlDatatabaseController;

    let appSyncClients = {};
    let awsAppsyncApiEndpoint;

    beforeAll(async () => {
      ({ dbController, region } = options);
      const { projFolderName, connectionConfigName } = options;
      const templatePath = path.resolve(path.join(__dirname, '..', '__tests__', 'backends', 'sql-userpool-access'));

      projRoot = await createNewProjectDir(projFolderName);

      const name = await initCDKProject(projRoot, templatePath, {
        additionalDependencies: [authConstructDependency],
      });
      dbController.writeDbDetails(projRoot, connectionConfigName, schema);
      let outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
      outputs = outputs[name];
      ({ awsAppsyncApiEndpoint } = outputs);

      const cognitoIdentityPoolCredentialsManager = new CognitoIdentityPoolCredentialsManager(outputs as AuthConstructStackOutputs);
      await cognitoIdentityPoolCredentialsManager.createUser({ username: userName1, email: userName1, password }, ['Admin']);
      await cognitoIdentityPoolCredentialsManager.createUser({ username: userName2, email: userName2, password }, ['Dev']);

      userMap[userName1] = await cognitoIdentityPoolCredentialsManager.getAuthRoleCredentials({ username: userName1, password });
      userMap[userName2] = await cognitoIdentityPoolCredentialsManager.getAuthRoleCredentials({ username: userName2, password });

      appSyncClients = await configureAppSyncClients(awsAppsyncApiEndpoint, region, [userPoolProvider], userMap);
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
        await dbController.clearDatabase();
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    test('logged in user can perform CRUD and subscription operations', async () => {
      const modelName = 'TodoPrivate';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todo = {
        content: 'Todo',
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelper.create(`create${modelName}`, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;
      checkOperationResult(createResult, todo, `create${modelName}`);

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
      };
      const updateResult = await todoHelper.update(`update${modelName}`, todoUpdated);
      checkOperationResult(updateResult, todoUpdated, `update${modelName}`);

      const getResult = await todoHelper.get({
        id: todo['id'],
      });
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelper.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id'], true);

      const deleteResult = await todoHelper.delete(`delete${modelName}`, {
        id: todo['id'],
      });
      checkOperationResult(deleteResult, todoUpdated, `delete${modelName}`);

      const todoRandom = {
        id: Date.now().toString(),
        content: 'Todo',
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(awsAppsyncApiEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
      console.log('onCreateSubscriptionResult', onCreateSubscriptionResult);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(onCreateSubscriptionResult[0], todoRandom, `onCreate${modelName}`);
      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await subTodoHelper.update(`update${modelName}`, todoRandomUpdated);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(onUpdateSubscriptionResult[0], todoRandomUpdated, `onUpdate${modelName}`);
      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [
        async () => {
          await subTodoHelper.delete(`delete${modelName}`, { id: todoRandom.id });
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(1);
      checkOperationResult(onDeleteSubscriptionResult[0], todoRandomUpdated, `onDelete${modelName}`);
    });
  });
};

import * as path from 'path';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { gql } from 'graphql-tag';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { AuthConstructStackOutputs } from '../types';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { schema as generateSchema } from '../sql-tests-common/schemas/sql-oidc-auth/oidc-auth-provider';
import { CognitoIdentityPoolCredentialsManager } from '../utils/sql-cognito-helper';
import { configureAppSyncClients, getConfiguredAppsyncClientCognitoAuth } from '../utils/appsync-model-operation/appsync-client-helper';
import {
  createModelOperationHelpers,
  checkOperationResult,
  checkListItemExistence,
} from '../utils/appsync-model-operation/model-operation-helper';
import { ONE_MINUTE } from '../utils/duration-constants';
import { authConstructDependency } from '../__tests__/additional-dependencies';

export const testGraphQLAPIWithOIDCAccess = (
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
    const oidcProvider = 'oidc';
    const userMap = {};
    const userName1 = 'user1@amazon.com';
    const userName2 = 'user2@amazon.com';
    const password = 'Password1234!';
    const adminGroupName = 'Admin';
    const devGroupName = 'Dev';

    let projRoot;
    let region;
    let dbController: SqlDatatabaseController;

    let appSyncClients = {};
    let awsAppsyncApiEndpoint;

    beforeAll(async () => {
      ({ dbController, region } = options);
      const { projFolderName, connectionConfigName } = options;
      const templatePath = path.resolve(path.join(__dirname, '..', '__tests__', 'backends', 'sql-oidc-access'));

      projRoot = await createNewProjectDir(projFolderName);

      const name = await initCDKProject(projRoot, templatePath, {
        additionalDependencies: [authConstructDependency],
      });
      dbController.writeDbDetails(projRoot, connectionConfigName, schema);
      let outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
      outputs = outputs[name];
      ({ awsAppsyncApiEndpoint } = outputs);

      console.log('Outputs:', outputs);
      const cognitoIdentityPoolCredentialsManager = new CognitoIdentityPoolCredentialsManager(outputs as AuthConstructStackOutputs);
      await cognitoIdentityPoolCredentialsManager.createUser({ username: userName1, email: userName1, password }, [adminGroupName]);
      await cognitoIdentityPoolCredentialsManager.createUser({ username: userName2, email: userName2, password }, [devGroupName]);

      userMap[userName1] = await cognitoIdentityPoolCredentialsManager.getAuthRoleCredentials({ username: userName1, password });
      console.log('userMap[userName1]:', userMap[userName1]);
      userMap[userName2] = await cognitoIdentityPoolCredentialsManager.getAuthRoleCredentials({ username: userName2, password });
      console.log('userMap[userName2]:', userMap[userName2]);

      appSyncClients = await configureAppSyncClients(awsAppsyncApiEndpoint, region, [oidcProvider], userMap);
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
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[oidcProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todo = {
        content: 'Todo',
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelper.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;
      checkOperationResult(createResult, todo, resultSetName);

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
    });
  });
};

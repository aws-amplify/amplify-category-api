import {
  addApiWithAllAuthModes,
  addApiWithoutSchema,
  amplifyPush,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  setupRDSInstanceAndData,
  sleep,
  updateAuthAddUserGroups,
} from 'amplify-category-api-e2e-core';
import { existsSync, writeFileSync, removeSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import { schema, sqlCreateStatements } from './auth-test-schemas/userpool-provider';
import { createModelOperationHelpers } from '../rds-v2-test-utils';
import { setupUser, getUserPoolId, signInUser, getConfiguredAppsyncClientCognitoAuth } from '../schema-api-directives';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Relational Directives', () => {
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  let region = 'us-east-1';
  let port = 3306;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const projName = 'rdsuserpoolauth';
  const userName1 = 'user1';
  const userName2 = 'user2';
  const adminGroupName = 'Admin';
  const devGroupName = 'Dev';
  const userPassword = 'user@Password';

  let projRoot;
  const appSyncClients = {};

  beforeAll(async () => {
    projRoot = await createNewProjectDir(projName);
    await initProjectAndImportSchema();
    await updateAuthAddUserGroups(projRoot, [adminGroupName, devGroupName]);
    const userPoolId = getUserPoolId(projRoot);
    await setupUser(userPoolId, userName1, userPassword, adminGroupName);
    await setupUser(userPoolId, userName2, userPassword, devGroupName);
    const userMap = {};
    const user1 = await signInUser(userName1, userPassword);
    userMap[userName1] = user1;
    const user2 = await signInUser(userName2, userPassword);
    userMap[userName2] = user2;
    await amplifyPush(projRoot);
    await sleep(2 * 60 * 1000); // Wait for 2 minutes for the VPC endpoints to be live.
    await configureAppSyncClients(userMap);
  });

  afterAll(async () => {
    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
    await cleanupDatabase();
  });

  const setupDatabase = async (): Promise<void> => {
    const dbConfig = {
      identifier,
      engine: 'mysql' as const,
      dbname: database,
      username,
      password,
      region,
    };

    const db = await setupRDSInstanceAndData(dbConfig, sqlCreateStatements);
    port = db.port;
    host = db.endpoint;
  };

  const cleanupDatabase = async (): Promise<void> => {
    await deleteDBInstance(identifier, region);
  };

  const initProjectAndImportSchema = async (): Promise<void> => {
    const apiName = projName;
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
      name: projName,
    });

    const metaAfterInit = getProjectMeta(projRoot);
    region = metaAfterInit.providers.awscloudformation.Region;
    await setupDatabase();

    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.rds.graphql');
    const ddbSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.graphql');

    await addApiWithAllAuthModes(projRoot, { transformerVersion: 2, apiName });
    removeSync(ddbSchemaFilePath);

    await importRDSDatabase(projRoot, {
      database,
      host,
      port,
      username,
      password,
      useVpc: true,
      apiExists: true,
    });

    writeFileSync(rdsSchemaFilePath, schema, 'utf8');
  };

  const configureAppSyncClients = async (userMap: { [key: string]: any }): Promise<void> => {
    const meta = getProjectMeta(projRoot);
    const appRegion = meta.providers.awscloudformation.Region;
    const { output } = meta.api[projName];
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, appRegion);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

    const apiEndPoint = GraphQLAPIEndpointOutput as string;

    Object.keys(userMap)?.map((userName: string) => {
      const userAppSyncClient = getConfiguredAppsyncClientCognitoAuth(apiEndPoint, appRegion, userMap[userName]);
      appSyncClients[userName] = userAppSyncClient;
    });
  };

  test('logged in user can perform CRUD operations', async () => {
    const modelName = 'TodoPrivate';
    const modelOperationHelpers = createModelOperationHelpers(configureAppSyncClients[userName1], schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo1 = {
      id: 'T-1',
      content: 'Todo 1',
    };
    const createResult = await todoHelper.create(`create${modelName}`, todo1);
    checkResult(createResult, todo1, `create${modelName}`);

    const todo1Updated = {
      id: todo1.id,
      content: 'Todo 1 updated',
    };
    const updateResult = await todoHelper.update(`update${modelName}`, todo1Updated);
    checkResult(updateResult, todo1Updated, `update${modelName}`);

    const getResult = await todoHelper.get({
      id: todo1.id,
    });
    checkResult(getResult, todo1Updated, `get${modelName}`);

    const listTodosResult = await todoHelper.list();
    checkResult(listTodosResult, { items: [{ ...todo1Updated }] }, `list${modelName}s`);

    const deleteResult = await todoHelper.delete(`delete${modelName}`, {
      id: todo1.id,
    });
    checkResult(deleteResult, todo1Updated, `delete${modelName}`);
  });

  test('owner of a record can perform CRUD operations using default owner field', async () => {
    const modelName = 'TodoOwner';
    const modelOperationHelpers = createModelOperationHelpers(configureAppSyncClients[userName1], schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo1 = {
      id: 'T-1',
      content: 'Todo 1',
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo1);
    expect(createResult.data[resultSetName].id).toEqual(todo1.id);
    expect(createResult.data[resultSetName].content).toEqual(todo1.content);
    expect(createResult.data[resultSetName].owner).toBeDefined();

    const todo1WithOwner = {
      ...todo1,
      owner: createResult.data[resultSetName].owner,
    };

    const todo1Updated = {
      id: todo1.id,
      content: 'Todo 1 updated',
      owner: todo1WithOwner.owner,
    };
    const updateResult = await todoHelper.update(`update${modelName}`, todo1Updated);
    checkResult(updateResult, todo1Updated, `update${modelName}`);

    const getResult = await todoHelper.get({
      id: todo1.id,
    });
    checkResult(getResult, todo1Updated, `get${modelName}`);

    const listTodosResult = await todoHelper.list();
    checkResult(listTodosResult, { items: [{ ...todo1Updated }] }, `list${modelName}s`);

    const deleteResult = await todoHelper.delete(`delete${modelName}`, {
      id: todo1.id,
    });
    checkResult(deleteResult, todo1Updated, `delete${modelName}`);
  });

  test('custom owner field used to store owner information', async () => {
    const modelName = 'TodoOwnerFieldString';
    const modelOperationHelpers = createModelOperationHelpers(configureAppSyncClients[userName1], schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo1 = {
      id: 'T-1',
      content: 'Todo 1',
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo1);
    expect(createResult.data[resultSetName].id).toEqual(todo1.id);
    expect(createResult.data[resultSetName].content).toEqual(todo1.content);
    expect(createResult.data[resultSetName].author).toEqual(userName1);

    const todo1WithOwner = {
      ...todo1,
      author: userName1,
    };

    const todo1Updated = {
      id: todo1.id,
      content: 'Todo 1 updated',
      author: todo1WithOwner.author,
    };
    const updateResult = await todoHelper.update(`update${modelName}`, todo1Updated);
    checkResult(updateResult, todo1Updated, `update${modelName}`);

    const getResult = await todoHelper.get({
      id: todo1.id,
    });
    checkResult(getResult, todo1Updated, `get${modelName}`);

    const listTodosResult = await todoHelper.list();
    checkResult(listTodosResult, { items: [{ ...todo1Updated }] }, `list${modelName}s`);

    const deleteResult = await todoHelper.delete(`delete${modelName}`, {
      id: todo1.id,
    });
    checkResult(deleteResult, todo1Updated, `delete${modelName}`);
  });

  test('list of owners used to store owner information', async () => {
    const modelName = 'TodoOwnerFieldList';
    const modelOperationHelpers = createModelOperationHelpers(configureAppSyncClients[userName1], schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo1 = {
      id: 'T-1',
      content: 'Todo 1',
      authors: [userName1],
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo1);
    expect(createResult.data[resultSetName].id).toEqual(todo1.id);
    expect(createResult.data[resultSetName].content).toEqual(todo1.content);
    expect(createResult.data[resultSetName].authors).toEqual([userName1]);

    const todo1Updated = {
      id: todo1.id,
      content: 'Todo 1 updated',
      authors: [userName1],
    };
    const updateResult = await todoHelper.update(`update${modelName}`, todo1Updated);
    checkResult(updateResult, todo1Updated, `update${modelName}`);

    const getResult = await todoHelper.get({
      id: todo1.id,
    });
    checkResult(getResult, todo1Updated, `get${modelName}`);

    const listTodosResult = await todoHelper.list();
    checkResult(listTodosResult, { items: [{ ...todo1Updated }] }, `list${modelName}s`);

    const deleteResult = await todoHelper.delete(`delete${modelName}`, {
      id: todo1.id,
    });
    checkResult(deleteResult, todo1Updated, `delete${modelName}`);
  });

  test('users in static group can perform CRUD operations', async () => {
    const modelName = 'TodoStaticGroup';
    const modelOperationHelpers = createModelOperationHelpers(configureAppSyncClients[userName1], schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo1 = {
      id: 'T-1',
      content: 'Todo 1',
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo1);
    expect(createResult.data[resultSetName].id).toEqual(todo1.id);
    expect(createResult.data[resultSetName].content).toEqual(todo1.content);

    const todo1Updated = {
      id: todo1.id,
      content: 'Todo 1 updated',
    };
    const updateResult = await todoHelper.update(`update${modelName}`, todo1Updated);
    checkResult(updateResult, todo1Updated, `update${modelName}`);

    const getResult = await todoHelper.get({
      id: todo1.id,
    });
    checkResult(getResult, todo1Updated, `get${modelName}`);

    const listTodosResult = await todoHelper.list();
    checkResult(listTodosResult, { items: [{ ...todo1Updated }] }, `list${modelName}s`);

    const deleteResult = await todoHelper.delete(`delete${modelName}`, {
      id: todo1.id,
    });
    checkResult(deleteResult, todo1Updated, `delete${modelName}`);
  });

  test('users in group stored as string can perform CRUD operations', async () => {
    const modelName = 'TodoGroupFieldString';
    const modelOperationHelpers = createModelOperationHelpers(configureAppSyncClients[userName1], schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo1 = {
      id: 'T-1',
      content: 'Todo 1',
      group: adminGroupName,
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo1);
    expect(createResult.data[resultSetName].id).toEqual(todo1.id);
    expect(createResult.data[resultSetName].content).toEqual(todo1.content);
    expect(createResult.data[resultSetName].group).toEqual(adminGroupName);

    const todo1Updated = {
      id: todo1.id,
      content: 'Todo 1 updated',
      group: adminGroupName,
    };
    const updateResult = await todoHelper.update(`update${modelName}`, todo1Updated);
    checkResult(updateResult, todo1Updated, `update${modelName}`);

    const getResult = await todoHelper.get({
      id: todo1.id,
    });
    checkResult(getResult, todo1Updated, `get${modelName}`);

    const listTodosResult = await todoHelper.list();
    checkResult(listTodosResult, { items: [{ ...todo1Updated }] }, `list${modelName}s`);

    const deleteResult = await todoHelper.delete(`delete${modelName}`, {
      id: todo1.id,
    });
    checkResult(deleteResult, todo1Updated, `delete${modelName}`);
  });

  test('users in groups stored as list can perform CRUD operations', async () => {
    const modelName = 'TodoGroupFieldList';
    const modelOperationHelpers = createModelOperationHelpers(configureAppSyncClients[userName1], schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo1 = {
      id: 'T-1',
      content: 'Todo 1',
      groups: [adminGroupName],
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo1);
    expect(createResult.data[resultSetName].id).toEqual(todo1.id);
    expect(createResult.data[resultSetName].content).toEqual(todo1.content);
    expect(createResult.data[resultSetName].groups).toEqual([adminGroupName]);

    const todo1Updated = {
      id: todo1.id,
      content: 'Todo 1 updated',
      groups: [adminGroupName],
    };
    const updateResult = await todoHelper.update(`update${modelName}`, todo1Updated);
    checkResult(updateResult, todo1Updated, `update${modelName}`);

    const getResult = await todoHelper.get({
      id: todo1.id,
    });
    checkResult(getResult, todo1Updated, `get${modelName}`);

    const listTodosResult = await todoHelper.list();
    checkResult(listTodosResult, { items: [{ ...todo1Updated }] }, `list${modelName}s`);

    const deleteResult = await todoHelper.delete(`delete${modelName}`, {
      id: todo1.id,
    });
    checkResult(deleteResult, todo1Updated, `delete${modelName}`);
  });

  const checkResult = (result: any, expected: any, resultSetName: string, isList: boolean = false): void => {
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data[resultSetName]).toBeDefined();
    expect(result.data[resultSetName]).toEqual(expected);
  };
});

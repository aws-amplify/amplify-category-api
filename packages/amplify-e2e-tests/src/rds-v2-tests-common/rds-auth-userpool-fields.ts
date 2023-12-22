import {
  addApi,
  amplifyPush,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  importRDSDatabase,
  initJSProjectWithProfile,
  setupRDSInstanceAndData,
  sleep,
  updateAuthAddUserGroups,
  getProjectMeta,
} from 'amplify-category-api-e2e-core';
import { existsSync, writeFileSync, removeSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import { schema as generateSchema, sqlCreateStatements } from '../__tests__/auth-test-schemas/userpool-provider-fields';
import {
  createModelOperationHelpers,
  configureAppSyncClients,
  checkOperationResult,
  checkListItemExistence,
  appendAmplifyInput,
  getAppSyncEndpoint,
  getDefaultDatabasePort,
  checkListResponseErrors,
} from '../rds-v2-test-utils';
import { setupUser, getUserPoolId, signInUser, configureAmplify, getConfiguredAppsyncClientCognitoAuth } from '../schema-api-directives';
import { gql } from 'graphql-tag';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

export const testUserPoolFieldAuth = (engine: ImportedRDSType): void => {
  const schema = generateSchema(engine);
  describe('SQL Cognito userpool provider Field Auth tests', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'us-east-1';
    let port = getDefaultDatabasePort(engine);
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const projName = 'fielduserpool';
    const userName1 = 'user1';
    const userName2 = 'user2';
    const adminGroupName = 'Admin';
    const devGroupName = 'Dev';
    const userPassword = 'user@Password';
    const userPoolProvider = 'userPools';
    const apiKeyProvider = 'apiKey';
    let graphQlEndpoint = 'localhost';

    let projRoot;
    let appSyncClients = {};
    const userMap = {};

    beforeAll(async () => {
      console.log(sqlCreateStatements(engine));
      projRoot = await createNewProjectDir(projName);
      await setupAmplifyProject();
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
        engine,
        dbname: database,
        username,
        password,
        region,
        port,
      };

      const db = await setupRDSInstanceAndData(dbConfig, sqlCreateStatements(engine));
      port = db.port;
      host = db.endpoint;
    };

    const cleanupDatabase = async (): Promise<void> => {
      await deleteDBInstance(identifier, region);
    };

    const subscriptionWithOwner = (name: string, ownerField: string = 'owner'): string => {
      return /* GraphQL */ `
            subscription On${name}($${ownerField}: String) {
              on${name}(${ownerField}: $${ownerField}) {
                id
                content
                ${ownerField}
              }
            }
          `;
    };

    const setupAmplifyProject = async (): Promise<void> => {
      const apiName = projName;
      await initJSProjectWithProfile(projRoot, {
        disableAmplifyAppCreation: false,
        name: projName,
      });

      const metaAfterInit = getProjectMeta(projRoot);
      region = metaAfterInit.providers.awscloudformation.Region;

      await addApi(projRoot, {
        transformerVersion: 2,
        'Amazon Cognito User Pool': {},
        'API key': {},
      });
      const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
      const ddbSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.graphql');
      removeSync(ddbSchemaFilePath);

      await setupDatabase();
      await importRDSDatabase(projRoot, {
        database,
        engine,
        host,
        port,
        username,
        password,
        useVpc: true,
        apiExists: true,
      });

      writeFileSync(rdsSchemaFilePath, appendAmplifyInput(schema, engine), 'utf8');

      await updateAuthAddUserGroups(projRoot, [adminGroupName, devGroupName]);
      await amplifyPush(projRoot, false, {
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
      await sleep(30 * 1000); // Wait for 30 seconds for the VPC endpoints to be live.

      const userPoolId = getUserPoolId(projRoot);
      configureAmplify(projRoot);
      await setupUser(userPoolId, userName1, userPassword, adminGroupName);
      await setupUser(userPoolId, userName2, userPassword, devGroupName);
      graphQlEndpoint = getAppSyncEndpoint(projRoot, apiName);
      const user1 = await signInUser(userName1, userPassword);
      userMap[userName1] = user1;
      const user2 = await signInUser(userName2, userPassword);
      userMap[userName2] = user2;
      appSyncClients = await configureAppSyncClients(projRoot, apiName, [userPoolProvider, apiKeyProvider], userMap);
    };

    test('Logged in user can perform CRUD and subscription operations with only private fields in the selection set', async () => {
      const modelName = 'TodoPrivateContentVarious';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todo = {
        privateContent: 'Todo',
      };
      const createResultSetName = `create${modelName}`;
      const privateResultSet = `
          id
          privateContent
        `;
      const createResult = await todoHelper.create(createResultSetName, todo, privateResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      // protected fields are nullified in mutation responses
      expect(createResult.data[createResultSetName].privateContent).toBeNull();

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Todo updated',
      };
      const updateResult = await todoHelper.update(`update${modelName}`, todoUpdated, privateResultSet);
      expect(updateResult.data[`update${modelName}`].id).toEqual(todo['id']);
      expect(updateResult.data[`update${modelName}`].privateContent).toBeNull();

      const getResult = await todoHelper.get(
        {
          id: todo['id'],
        },
        privateResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelper.list({}, privateResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await todoHelper.delete(`delete${modelName}`, { id: todo['id'] }, privateResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);

      const todoRandom = {
        id: Date.now().toString(),
        privateContent: 'Todo',
      };
      const todoRandomUpdated = {
        ...todoRandom,
        privateContent: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await subTodoHelper.create(createResultSetName, todoRandom, privateResultSet);
          },
        ],
        {},
        privateResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].id).toEqual(todoRandom.id);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].privateContent).toBeNull();

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await subTodoHelper.update(`update${modelName}`, todoRandomUpdated, privateResultSet);
          },
        ],
        {},
        privateResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].id).toEqual(todoRandom.id);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].privateContent).toBeNull();

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, privateResultSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('Logged in user cannot perform CRUD and subscription operations on non-private fields', async () => {
      const modelName = 'TodoPrivateContentVarious';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todoWithPrivateFields = {
        privateContent: 'PrivateContent',
      };
      const todo = {
        ...todoWithPrivateFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
          id
          privateContent
          publicContent
        `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelper.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with only private fields which is allowed, so we can test the update and delete operations.
      const privateResultSet = `
          id
          privateContent
        `;
      const createResult = await todoHelper.create(createResultSetName, todoWithPrivateFields, privateResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
      };

      await expect(async () => await todoHelper.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelper.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);

      const todoRandom = {
        ...todoWithPrivateFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithPrivateFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(createResultSetName, todoRandom, privateResultSet);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, publicContent: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await subTodoHelper.update(`update${modelName}`, todoRandomUpdated, privateResultSet);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, publicContent: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', []);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('non-owner can perform CRUD operations with only private fields in selection set', async () => {
      const modelName = 'TodoOwnerContentVarious';
      const ownerModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const nonOwnerModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const ownerTodoHelper = ownerModelOperationHelpers[modelName];
      const nonOwnerTodoHelper = nonOwnerModelOperationHelpers[modelName];

      const todo = {
        privateContent: 'Todo',
      };
      const createResultSetName = `create${modelName}`;
      const privateResultSet = `
          id
          privateContent
        `;
      const ownerAllowedResultSet = `
          id
          owner
          privateContent
        `;

      // owner creates a record with only allowed fields
      const createResult = await ownerTodoHelper.create(createResultSetName, todo, ownerAllowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      // protected fields are nullified in mutation responses
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].owner).toEqual(userName1);
      todo['owner'] = userName1;

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Todo updated',
      };
      // non-owner can update the private protected field
      const updateResult = await nonOwnerTodoHelper.update(`update${modelName}`, todoUpdated, privateResultSet);
      expect(updateResult.data[`update${modelName}`].id).toEqual(todo['id']);
      expect(updateResult.data[`update${modelName}`].privateContent).toBeNull();

      // non-owner can read the private protected field
      const getResult = await nonOwnerTodoHelper.get(
        {
          id: todo['id'],
        },
        privateResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await nonOwnerTodoHelper.list({}, privateResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await nonOwnerTodoHelper.delete(`delete${modelName}`, { id: todo['id'] }, privateResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);
    });

    test('owner cannot perform CRUD and subscription operations on public protected field', async () => {
      const modelName = 'TodoOwnerContentVarious';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todoWithPrivateFields = {
        privateContent: 'PrivateContent',
      };
      const todo = {
        ...todoWithPrivateFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
          id
          owner
          privateContent
          publicContent
        `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelper.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with non-public fields which is allowed, so we can test the update and delete operations.
      const allowedResultSet = `
          id
          owner
          privateContent
        `;
      const createResult = await todoHelper.create(createResultSetName, todoWithPrivateFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].owner).toEqual(userName1);
      todo['owner'] = userName1;

      const todoWithAllowedFields = {
        ...todoWithPrivateFields,
        owner: userName1,
        id: todo['id'],
      };

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
        owner: userName1,
      };

      await expect(async () => await todoHelper.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelper.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);

      const todoRandom = {
        ...todoWithAllowedFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithAllowedFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(createResultSetName, todoRandom, allowedResultSet);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, publicContent: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await subTodoHelper.update(`update${modelName}`, todoRandomUpdated, allowedResultSet);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, publicContent: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', []);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('custom non-owner can perform CRUD operations with only private fields in selection set', async () => {
      const modelName = 'TodoCustomOwnerContentVarious';
      const ownerModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const nonOwnerModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const ownerTodoHelper = ownerModelOperationHelpers[modelName];
      const nonOwnerTodoHelper = nonOwnerModelOperationHelpers[modelName];

      const todo = {
        privateContent: 'Todo',
      };
      const createResultSetName = `create${modelName}`;
      const privateResultSet = `
          id
          privateContent
        `;
      const ownerAllowedResultSet = `
          id
          author
          privateContent
        `;

      // owner creates a record with only allowed fields
      const createResult = await ownerTodoHelper.create(createResultSetName, todo, ownerAllowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      // protected fields are nullified in mutation responses
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].author).toEqual(userName1);
      todo['author'] = userName1;

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Todo updated',
      };
      // non-owner can update the private protected field
      const updateResult = await nonOwnerTodoHelper.update(`update${modelName}`, todoUpdated, privateResultSet);
      expect(updateResult.data[`update${modelName}`].id).toEqual(todo['id']);
      expect(updateResult.data[`update${modelName}`].privateContent).toBeNull();

      // non-owner can read the private protected field
      const getResult = await nonOwnerTodoHelper.get(
        {
          id: todo['id'],
        },
        privateResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await nonOwnerTodoHelper.list({}, privateResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await nonOwnerTodoHelper.delete(`delete${modelName}`, { id: todo['id'] }, privateResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);
    });

    test('custom owner cannot perform CRUD and subscription operations on public protected field', async () => {
      const modelName = 'TodoCustomOwnerContentVarious';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todoWithPrivateFields = {
        privateContent: 'PrivateContent',
      };
      const todo = {
        ...todoWithPrivateFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
          id
          author
          privateContent
          publicContent
        `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelper.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with non-public fields which is allowed, so we can test the update and delete operations.
      const allowedResultSet = `
          id
          author
          privateContent
        `;
      const createResult = await todoHelper.create(createResultSetName, todoWithPrivateFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].author).toEqual(userName1);
      todo['author'] = userName1;

      const todoWithAllowedFields = {
        ...todoWithPrivateFields,
        author: userName1,
        id: todo['id'],
      };

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
        author: userName1,
      };

      await expect(async () => await todoHelper.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelper.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);

      const todoRandom = {
        ...todoWithAllowedFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithAllowedFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(createResultSetName, todoRandom, allowedResultSet);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, publicContent: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await subTodoHelper.update(`update${modelName}`, todoRandomUpdated, allowedResultSet);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, publicContent: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', []);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('user not part of custom owners can perform CRUD operations with only private fields in selection set', async () => {
      const modelName = 'TodoCustomOwnersContentVarious';
      const ownerModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const nonOwnerModelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const ownerTodoHelper = ownerModelOperationHelpers[modelName];
      const nonOwnerTodoHelper = nonOwnerModelOperationHelpers[modelName];

      const todo = {
        privateContent: 'Todo',
      };
      const createResultSetName = `create${modelName}`;
      const privateResultSet = `
          id
          privateContent
        `;
      const ownerAllowedResultSet = `
          id
          authors
          privateContent
        `;

      // owner creates a record with only allowed fields
      const createResult = await ownerTodoHelper.create(createResultSetName, todo, ownerAllowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      // protected fields are nullified in mutation responses
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].authors).toEqual([userName1]);
      todo['authors'] = [userName1];

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Todo updated',
      };
      // non-owner can update the private protected field
      const updateResult = await nonOwnerTodoHelper.update(`update${modelName}`, todoUpdated, privateResultSet);
      expect(updateResult.data[`update${modelName}`].id).toEqual(todo['id']);
      expect(updateResult.data[`update${modelName}`].privateContent).toBeNull();

      // non-owner can read the private protected field
      const getResult = await nonOwnerTodoHelper.get(
        {
          id: todo['id'],
        },
        privateResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await nonOwnerTodoHelper.list({}, privateResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await nonOwnerTodoHelper.delete(`delete${modelName}`, { id: todo['id'] }, privateResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);
    });

    test('user part of custom owners cannot perform CRUD and subscription operations on public protected field', async () => {
      const modelName = 'TodoCustomOwnersContentVarious';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todoWithPrivateFields = {
        privateContent: 'PrivateContent',
      };
      const todo = {
        ...todoWithPrivateFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
          id
          authors
          privateContent
          publicContent
        `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelper.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with non-public fields which is allowed, so we can test the update and delete operations.
      const allowedResultSet = `
          id
          authors
          privateContent
        `;
      const createResult = await todoHelper.create(createResultSetName, todoWithPrivateFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].authors).toEqual([userName1]);
      todo['authors'] = [userName1];

      const todoWithAllowedFields = {
        ...todoWithPrivateFields,
        authors: [userName1],
        id: todo['id'],
      };

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
        authors: [userName1],
      };

      await expect(async () => await todoHelper.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelper.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);

      const todoRandom = {
        ...todoWithAllowedFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithAllowedFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(createResultSetName, todoRandom, allowedResultSet);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, publicContent: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await subTodoHelper.update(`update${modelName}`, todoRandomUpdated, allowedResultSet);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, publicContent: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', []);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('non-admin users can perform CRUD and subscription operations with only private fields in selection set', async () => {
      const modelName = 'TodoAdminContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithPrivateFields = {
        privateContent: 'PrivateContent',
      };
      const privateResultSet = `
          id
          privateContent
        `;
      const createResultSetName = `create${modelName}`;

      // admin is able to create a record with only private fields
      const createResult = await todoHelperNonAdmin.create(createResultSetName, todoWithPrivateFields, privateResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todoWithPrivateFields['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();

      const todoUpdated = {
        id: todoWithPrivateFields['id'],
        privateContent: 'Private Content updated',
      };

      const updateResult = await todoHelperNonAdmin.update(`update${modelName}`, todoUpdated, privateResultSet);
      expect(updateResult.data[`update${modelName}`].id).toEqual(todoWithPrivateFields['id']);
      expect(updateResult.data[`update${modelName}`].privateContent).toBeNull();

      const getResult = await todoHelperNonAdmin.get(
        {
          id: todoWithPrivateFields['id'],
        },
        privateResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelperNonAdmin.list({}, privateResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todoWithPrivateFields['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await todoHelperNonAdmin.delete(`delete${modelName}`, { id: todoWithPrivateFields['id'] }, privateResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);

      const todoRandom = {
        ...todoWithPrivateFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithPrivateFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await todoHelperAdmin.create(createResultSetName, todoRandom, privateResultSet);
          },
        ],
        {},
        privateResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].id).toEqual(todoRandom.id);
      expect(onCreateSubscriptionResult[0].data[`onCreate${modelName}`].privateContent).toBeNull();

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await todoHelperAdmin.update(`update${modelName}`, todoRandomUpdated, privateResultSet);
          },
        ],
        {},
        privateResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].id).toEqual(todoRandom.id);
      expect(onUpdateSubscriptionResult[0].data[`onUpdate${modelName}`].privateContent).toBeNull();

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, privateResultSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('admin users cannot perform CRUD and subscription operations on public protected field', async () => {
      const modelName = 'TodoAdminContentVarious';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todoWithPrivateFields = {
        privateContent: 'PrivateContent',
      };
      const todo = {
        ...todoWithPrivateFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
          id
          privateContent
          publicContent
        `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelper.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with only allowed fields, so we can test the update and delete operations.
      const privateResultSet = `
          id
          privateContent
        `;
      const createResult = await todoHelper.create(createResultSetName, todoWithPrivateFields, privateResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;

      const todoUpdated = {
        id: todo['id'],
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
      };

      await expect(async () => await todoHelper.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelper.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelper.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);

      const todoRandom = {
        ...todoWithPrivateFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithPrivateFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(createResultSetName, todoRandom, privateResultSet);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, publicContent: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
        async () => {
          await subTodoHelper.update(`update${modelName}`, todoRandomUpdated, privateResultSet);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onUpdateSubscriptionResult[0],
        { ...todoRandomUpdated, publicContent: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', []);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test.skip('user not part of allowed custom group of a record can perform CRUD and subscription operations with only allowed fields in selection set', async () => {
      const modelName = 'TodoCustomGroupContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithAllowedFields = {
        privateContent: 'PrivateContent',
        customGroup: adminGroupName,
      };
      const allowedResultSet = `
          id
          customGroup
          privateContent
        `;
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;

      // admin is able to create a record with only private fields
      const createResult = await todoHelperAdmin.create(createResultSetName, todoWithAllowedFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todoWithAllowedFields['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].customGroup).toBeNull();

      const todoUpdated = {
        ...todoWithAllowedFields,
        privateContent: 'Private Content updated',
      };

      // non-admin can update the private protected field
      const updateResult = await todoHelperNonAdmin.update(updateResultSetName, todoUpdated, allowedResultSet);
      checkOperationResult(updateResult, { ...todoUpdated, customGroup: null, privateContent: null }, updateResultSetName);

      // non-admin can read the private protected field
      const getResult = await todoHelperNonAdmin.get(
        {
          id: todoWithAllowedFields['id'],
        },
        allowedResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelperNonAdmin.list({}, allowedResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todoWithAllowedFields['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await todoHelperNonAdmin.delete(`delete${modelName}`, { id: todoWithAllowedFields['id'] }, allowedResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);

      const todoRandom = {
        ...todoWithAllowedFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithAllowedFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await todoHelperAdmin.create(createResultSetName, todoRandom, allowedResultSet);
          },
        ],
        {},
        allowedResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, customGroup: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await todoHelperAdmin.update(`update${modelName}`, todoRandomUpdated, allowedResultSet);
          },
        ],
        {},
        allowedResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandomUpdated, customGroup: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, allowedResultSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('user part of allowed custom group of a record cannot perform CRUD operations on public protected field', async () => {
      const modelName = 'TodoCustomGroupContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithAllowedFields = {
        privateContent: 'PrivateContent',
        customGroup: adminGroupName,
      };
      const todo = {
        ...todoWithAllowedFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
          id
          customGroup
          privateContent
          publicContent
        `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelperAdmin.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with allowed fields only, so we can test the update and delete operations.
      const allowedResultSet = `
          id
          customGroup
          privateContent
        `;
      const createResult = await todoHelperAdmin.create(createResultSetName, todoWithAllowedFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].customGroup).toBeNull();

      const todoUpdated = {
        ...todo,
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
      };

      await expect(async () => await todoHelperAdmin.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelperAdmin.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelperAdmin.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);
    });

    test.skip('user not part of group in allowed custom groups list of a record can perform CRUD and subscription operations with only allowed fields in selection set', async () => {
      const modelName = 'TodoCustomGroupsContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithAllowedFields = {
        privateContent: 'PrivateContent',
        customGroups: [adminGroupName],
      };
      const allowedResultSet = `
          id
          customGroups
          privateContent
        `;
      const createResultSetName = `create${modelName}`;
      const updateResultSetName = `update${modelName}`;

      // admin is able to create a record with only private fields
      const createResult = await todoHelperAdmin.create(createResultSetName, todoWithAllowedFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todoWithAllowedFields['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].customGroups).toBeNull();

      const todoUpdated = {
        ...todoWithAllowedFields,
        privateContent: 'Private Content updated',
      };

      // non-admin can update the private protected field
      const updateResult = await todoHelperNonAdmin.update(updateResultSetName, todoUpdated, allowedResultSet);
      checkOperationResult(updateResult, { ...todoUpdated, customGroups: null, privateContent: null }, updateResultSetName);

      // non-admin can read the private protected field
      const getResult = await todoHelperNonAdmin.get(
        {
          id: todoWithAllowedFields['id'],
        },
        allowedResultSet,
        false,
      );
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelperNonAdmin.list({}, allowedResultSet, `list${modelName}`, false);
      checkListItemExistence(listTodosResult, `list${modelName}`, todoWithAllowedFields['id'], true);

      // unless all fields have same Auth rules as the model, delete is expected to fail
      await expect(
        async () => await todoHelperNonAdmin.delete(`delete${modelName}`, { id: todoWithAllowedFields['id'] }, allowedResultSet),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access delete${modelName} on type Mutation"`);

      const todoRandom = {
        ...todoWithAllowedFields,
        id: Date.now().toString(),
      };
      const todoRandomUpdated = {
        ...todoWithAllowedFields,
        id: todoRandom.id,
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await todoHelperAdmin.create(createResultSetName, todoRandom, allowedResultSet);
          },
        ],
        {},
        allowedResultSet,
        false,
      );
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandom, customGroups: null, privateContent: null },
        `onCreate${modelName}`,
      );

      const onUpdateSubscriptionResult = await subTodoHelper.subscribe(
        'onUpdate',
        [
          async () => {
            await todoHelperAdmin.update(`update${modelName}`, todoRandomUpdated, allowedResultSet);
          },
        ],
        {},
        allowedResultSet,
        false,
      );
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(
        onCreateSubscriptionResult[0],
        { ...todoRandomUpdated, customGroups: null, privateContent: null },
        `onUpdate${modelName}`,
      );

      const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [], {}, allowedResultSet, false);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('user part of group in allowed custom groups list of a record cannot perform CRUD operations on public protected field', async () => {
      const modelName = 'TodoCustomGroupsContentVarious';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todoWithAllowedFields = {
        privateContent: 'PrivateContent',
        customGroups: [adminGroupName],
      };
      const todo = {
        ...todoWithAllowedFields,
        publicContent: 'PublicContent',
      };
      const completeResultSet = `
          id
          customGroups
          privateContent
          publicContent
        `;
      const createResultSetName = `create${modelName}`;

      await expect(async () => await todoHelperAdmin.create(createResultSetName, todo)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access create${modelName} on type Mutation"`,
      );

      // Create a record with allowed fields only, so we can test the update and delete operations.
      const allowedResultSet = `
          id
          customGroups
          privateContent
        `;
      const createResult = await todoHelperAdmin.create(createResultSetName, todoWithAllowedFields, allowedResultSet);
      expect(createResult.data[createResultSetName].id).toBeDefined();
      todo['id'] = createResult.data[createResultSetName].id;
      expect(createResult.data[createResultSetName].privateContent).toBeNull();
      expect(createResult.data[createResultSetName].customGroups).toBeNull();

      const todoUpdated = {
        ...todo,
        privateContent: 'Private Content updated',
        publicContent: 'Public Content updated',
      };

      await expect(async () => await todoHelperAdmin.update(`update${modelName}`, todoUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access update${modelName} on type Mutation"`,
      );

      const expectedFieldError = `"GraphQL error: Not Authorized to access publicContent on type ${modelName}"`;
      const getResult = await todoHelperAdmin.get({ id: todo['id'] }, undefined, true, 'all');
      checkOperationResult(getResult, { ...todo, publicContent: null }, `get${modelName}`, false, [expectedFieldError]);

      const listTodosResult = await todoHelperAdmin.list({}, completeResultSet, `list${modelName}`, false, 'all');
      checkListItemExistence(listTodosResult, `list${modelName}`, todo['id'], true);
      checkListResponseErrors(listTodosResult, [`Not Authorized to access publicContent on type ${modelName}`]);
    });
  });
};

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
import { schema as generateSchema, sqlCreateStatements } from '../__tests__/auth-test-schemas/userpool-provider';
import {
  createModelOperationHelpers,
  configureAppSyncClients,
  checkOperationResult,
  checkListItemExistence,
  appendAmplifyInput,
  getAppSyncEndpoint,
  getDefaultDatabasePort,
} from '../rds-v2-test-utils';
import { setupUser, getUserPoolId, signInUser, configureAmplify, getConfiguredAppsyncClientCognitoAuth } from '../schema-api-directives';
import { gql } from 'graphql-tag';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

export const testUserPoolAuth = (engine: ImportedRDSType): void => {
  const schema = generateSchema(engine);
  describe('RDS Cognito userpool provider Auth tests', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'us-east-1';
    let port = getDefaultDatabasePort(engine);
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const projName = 'rdsuserpoolauth';
    const userName1 = 'user1';
    const userName2 = 'user2';
    const adminGroupName = 'Admin';
    const devGroupName = 'Dev';
    const userPassword = 'user@Password';
    const userPoolProvider = 'userPools';
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
      appSyncClients = await configureAppSyncClients(projRoot, apiName, [userPoolProvider], userMap);
    };

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
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
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

    test('owner of a record can perform CRUD operations using default owner field', async () => {
      const modelName = 'TodoOwner';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todo = {
        content: 'Todo',
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelper.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;
      expect(createResult.data[resultSetName].content).toEqual(todo.content);
      expect(createResult.data[resultSetName].owner).toBeDefined();

      const todoWithOwner = {
        ...todo,
        owner: createResult.data[resultSetName]?.owner,
      };

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        owner: todoWithOwner.owner,
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
        owner: userName1,
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
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

    test('non-owner of a record cannot access it using default owner field', async () => {
      const modelName = 'TodoOwner';
      const modelOperationHelpersOwner = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonOwner = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperOwner = modelOperationHelpersOwner[modelName];
      const todoHelperNonOwner = modelOperationHelpersNonOwner[modelName];

      const todo = {
        content: 'Todo',
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelperOwner.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        owner: userName2,
      };
      await expect(async () => {
        await todoHelperNonOwner.update(`update${modelName}`, todoUpdated);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access updateTodoOwner on type Mutation"`);

      await expect(async () => {
        const getResult = await todoHelperNonOwner.get({
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwner on type Query"`);

      const listTodosResult = await todoHelperNonOwner.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

      await expect(async () => {
        await todoHelperNonOwner.delete(`delete${modelName}`, {
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access deleteTodoOwner on type Mutation"`);

      const todoRandom = {
        id: Date.now().toString(),
        content: 'Todo',
        owner: userName1,
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const observerClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const actorTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];
      const observerTodoHelper = createModelOperationHelpers(observerClient, schema)[modelName];

      const onCreateSubscriptionResult = await observerTodoHelper.subscribe('onCreate', [
        async () => {
          await actorTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(0);
      const onUpdateSubscriptionResult = await observerTodoHelper.subscribe('onUpdate', [
        async () => {
          await actorTodoHelper.update(`update${modelName}`, todoRandomUpdated);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(0);
      const onDeleteSubscriptionResult = await observerTodoHelper.subscribe('onDelete', [
        async () => {
          await actorTodoHelper.delete(`delete${modelName}`, { id: todoRandom.id });
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('custom owner field used to store owner information', async () => {
      const modelName = 'TodoOwnerFieldString';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todo = {
        content: 'Todo',
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelper.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;
      expect(createResult.data[resultSetName].content).toEqual(todo.content);
      expect(createResult.data[resultSetName].author).toEqual(userName1);

      const todoWithOwner = {
        ...todo,
        author: userName1,
      };

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        author: todoWithOwner.author,
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
        author: userName1,
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await subTodoHelper.create(`create${modelName}`, todoRandom);
          },
        ],
        { author: userName1 },
        subscriptionWithOwner(`Create${modelName}`, 'author'),
      );
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

    test('non-owner of a record cannot pretend to be an owner and gain access', async () => {
      const modelName = 'TodoOwnerFieldString';
      const modelOperationHelpersOwner = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonOwner = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperOwner = modelOperationHelpersOwner[modelName];
      const todoHelperNonOwner = modelOperationHelpersNonOwner[modelName];

      const todo = {
        content: 'Todo',
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelperOwner.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        author: userName1,
      };
      await expect(async () => {
        await todoHelperNonOwner.update(`update${modelName}`, todoUpdated);
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access updateTodoOwnerFieldString on type Mutation"`,
      );

      await expect(async () => {
        const getResult = await todoHelperNonOwner.get({
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwner on type Query"`);

      const listTodosResult = await todoHelperNonOwner.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

      await expect(async () => {
        await todoHelperNonOwner.delete(`delete${modelName}`, {
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access deleteTodoOwnerFieldString on type Mutation"`,
      );

      const todoRandom = {
        id: Date.now().toString(),
        content: 'Todo',
        author: userName1,
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };

      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const observerClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const actorTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];
      const observerTodoHelper = createModelOperationHelpers(observerClient, schema)[modelName];

      const onCreateSubscriptionResult = await observerTodoHelper.subscribe(
        'onCreate',
        [
          async () => {
            await actorTodoHelper.create(`create${modelName}`, todoRandom);
          },
        ],
        { author: userName1 },
        subscriptionWithOwner(`Create${modelName}`, 'author'),
      );
      expect(onCreateSubscriptionResult).toHaveLength(0);
      const onUpdateSubscriptionResult = await observerTodoHelper.subscribe('onUpdate', [
        async () => {
          await actorTodoHelper.update(`update${modelName}`, todoRandomUpdated);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(0);
      const onDeleteSubscriptionResult = await observerTodoHelper.subscribe('onDelete', [
        async () => {
          await actorTodoHelper.delete(`delete${modelName}`, { id: todoRandom.id });
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('member in list of owners can perform CRUD and subscription operations', async () => {
      const modelName = 'TodoOwnerFieldList';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todo = {
        content: 'Todo',
        authors: [userName1],
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelper.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;
      expect(createResult.data[resultSetName].content).toEqual(todo.content);
      expect(createResult.data[resultSetName].authors).toEqual([userName1]);

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        authors: [userName1],
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
        authors: [userName1],
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
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

    test('non-owner of a record cannot add themself to owner list', async () => {
      const modelName = 'TodoOwnerFieldList';
      const modelOperationHelpersOwner = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonOwner = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperOwner = modelOperationHelpersOwner[modelName];
      const todoHelperNonOwner = modelOperationHelpersNonOwner[modelName];

      const todo = {
        content: 'Todo',
        authors: [userName1],
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelperOwner.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        authors: [userName1, userName2],
      };
      await expect(async () => {
        await todoHelperNonOwner.update(`update${modelName}`, todoUpdated);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access updateTodoOwnerFieldList on type Mutation"`);

      await expect(async () => {
        const getResult = await todoHelperNonOwner.get({
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwner on type Query"`);

      const listTodosResult = await todoHelperNonOwner.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

      await expect(async () => {
        await todoHelperNonOwner.delete(`delete${modelName}`, {
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access deleteTodoOwnerFieldList on type Mutation"`);

      const todoRandom = {
        id: Date.now().toString(),
        content: 'Todo',
        authors: [userName1],
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const observerClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const actorTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];
      const observerTodoHelper = createModelOperationHelpers(observerClient, schema)[modelName];

      const onCreateSubscriptionResult = await observerTodoHelper.subscribe('onCreate', [
        async () => {
          await actorTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(0);
      const onUpdateSubscriptionResult = await observerTodoHelper.subscribe('onUpdate', [
        async () => {
          await actorTodoHelper.update(`update${modelName}`, todoRandomUpdated);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(0);
      const onDeleteSubscriptionResult = await observerTodoHelper.subscribe('onDelete', [
        async () => {
          await actorTodoHelper.delete(`delete${modelName}`, { id: todoRandom.id });
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('owner can add another user to the owner list', async () => {
      const modelName = 'TodoOwnerFieldList';
      const modelOperationHelpersOwner = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonOwner = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperOwner = modelOperationHelpersOwner[modelName];
      const todoHelperAnotherOwner = modelOperationHelpersNonOwner[modelName];

      const todo = {
        content: 'Todo',
        authors: [userName1, userName2],
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelperOwner.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        authors: [userName1, userName2],
      };
      const updateResult = await todoHelperAnotherOwner.update(`update${modelName}`, todoUpdated);
      checkOperationResult(updateResult, todoUpdated, `update${modelName}`);

      const getResult = await todoHelperAnotherOwner.get({
        id: todo['id'],
      });
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelperAnotherOwner.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id'], true);

      const deleteResult = await todoHelperAnotherOwner.delete(`delete${modelName}`, {
        id: todo['id'],
      });
      checkOperationResult(deleteResult, todoUpdated, `delete${modelName}`);

      const todoRandom = {
        id: Date.now().toString(),
        content: 'Todo',
        authors: [userName1, userName2],
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const observerClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const actorTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];
      const observerTodoHelper = createModelOperationHelpers(observerClient, schema)[modelName];

      const onCreateSubscriptionResult = await observerTodoHelper.subscribe('onCreate', [
        async () => {
          await actorTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(onCreateSubscriptionResult[0], todoRandom, `onCreate${modelName}`);
      const onUpdateSubscriptionResult = await observerTodoHelper.subscribe('onUpdate', [
        async () => {
          await actorTodoHelper.update(`update${modelName}`, todoRandomUpdated);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(onUpdateSubscriptionResult[0], todoRandomUpdated, `onUpdate${modelName}`);
      const onDeleteSubscriptionResult = await observerTodoHelper.subscribe('onDelete', [
        async () => {
          await actorTodoHelper.delete(`delete${modelName}`, { id: todoRandom.id });
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(1);
      checkOperationResult(onDeleteSubscriptionResult[0], todoRandomUpdated, `onDelete${modelName}`);
    });

    test('users in static group can perform CRUD and subscription operations', async () => {
      const modelName = 'TodoStaticGroup';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todo = {
        content: 'Todo',
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelper.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;
      expect(createResult.data[resultSetName].content).toEqual(todo.content);

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
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
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

    test('users not in static group cannot perform CRUD operations', async () => {
      const modelName = 'TodoStaticGroup';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todo = {
        content: 'Todo',
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelperAdmin.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;

      await expect(async () => {
        await todoHelperNonAdmin.create(`create${modelName}`, todo);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access createTodoStaticGroup on type Mutation"`);

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
      };
      await expect(async () => {
        await todoHelperNonAdmin.update(`update${modelName}`, todoUpdated);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access updateTodoStaticGroup on type Mutation"`);

      expect(
        async () =>
          await todoHelperNonAdmin.get({
            id: todo['id'],
          }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoStaticGroup on type Query"`);

      await expect(async () => {
        await todoHelperNonAdmin.list();
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access listTodoStaticGroups on type Query"`);

      await expect(async () => {
        await todoHelperNonAdmin.delete(`delete${modelName}`, {
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access deleteTodoStaticGroup on type Mutation"`);
    });

    test('users in group stored as string can perform CRUD operations', async () => {
      const modelName = 'TodoGroupFieldString';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todo = {
        content: 'Todo',
        groupField: adminGroupName,
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelper.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;
      expect(createResult.data[resultSetName].content).toEqual(todo.content);
      expect(createResult.data[resultSetName].groupField).toEqual(adminGroupName);

      const todo1Updated = {
        id: todo['id'],
        content: 'Todo updated',
        groupField: adminGroupName,
      };
      const updateResult = await todoHelper.update(`update${modelName}`, todo1Updated);
      checkOperationResult(updateResult, todo1Updated, `update${modelName}`);

      const getResult = await todoHelper.get({
        id: todo['id'],
      });
      checkOperationResult(getResult, todo1Updated, `get${modelName}`);

      const listTodosResult = await todoHelper.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id'], true);

      const deleteResult = await todoHelper.delete(`delete${modelName}`, {
        id: todo['id'],
      });
      checkOperationResult(deleteResult, todo1Updated, `delete${modelName}`);

      const todoRandom = {
        id: Date.now().toString(),
        content: 'Todo',
        groupField: adminGroupName,
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
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

    test('users cannot spoof their group membership and gain access', async () => {
      const modelName = 'TodoGroupFieldString';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todo = {
        content: 'Todo',
        groupField: adminGroupName,
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelperAdmin.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;

      await expect(async () => {
        await todoHelperNonAdmin.create(resultSetName, todo);
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access createTodoGroupFieldString on type Mutation"`,
      );

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        groupField: devGroupName,
      };
      await expect(async () => {
        await todoHelperNonAdmin.update(`update${modelName}`, todoUpdated);
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access updateTodoGroupFieldString on type Mutation"`,
      );

      await expect(async () => {
        const getResult = await todoHelperNonAdmin.get({
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwner on type Query"`);

      const listTodosResult = await todoHelperNonAdmin.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

      await expect(async () => {
        await todoHelperNonAdmin.delete(`delete${modelName}`, {
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access deleteTodoGroupFieldString on type Mutation"`,
      );
    });

    test('users in groups stored as list can perform CRUD operations', async () => {
      const modelName = 'TodoGroupFieldList';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const todoHelper = modelOperationHelpers[modelName];

      const todo = {
        content: 'Todo',
        groupsField: [adminGroupName],
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelper.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;
      expect(createResult.data[resultSetName].content).toEqual(todo.content);
      expect(createResult.data[resultSetName].groupsField).toEqual([adminGroupName]);

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        groupsField: [adminGroupName],
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
        groupsField: [adminGroupName],
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
        async () => {
          await subTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
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

    test('users not part of allowed groups cannot access the records or modify allowed groups', async () => {
      const modelName = 'TodoGroupFieldList';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todo = {
        content: 'Todo',
        groupsField: [adminGroupName],
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelperAdmin.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        groupsField: [adminGroupName, devGroupName],
      };
      await expect(async () => {
        await todoHelperNonAdmin.update(`update${modelName}`, todoUpdated);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access updateTodoGroupFieldList on type Mutation"`);

      await expect(async () => {
        const getResult = await todoHelperNonAdmin.get({
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwner on type Query"`);

      const listTodosResult = await todoHelperNonAdmin.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

      await expect(async () => {
        await todoHelperNonAdmin.delete(`delete${modelName}`, {
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access deleteTodoGroupFieldList on type Mutation"`);

      const todoRandom = {
        id: Date.now().toString(),
        content: 'Todo',
        groupsField: [adminGroupName],
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const observerClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const actorTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];
      const observerTodoHelper = createModelOperationHelpers(observerClient, schema)[modelName];

      const onCreateSubscriptionResult = await observerTodoHelper.subscribe('onCreate', [
        async () => {
          await actorTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(0);
      const onUpdateSubscriptionResult = await observerTodoHelper.subscribe('onUpdate', [
        async () => {
          await actorTodoHelper.update(`update${modelName}`, todoRandomUpdated);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(0);
      const onDeleteSubscriptionResult = await observerTodoHelper.subscribe('onDelete', [
        async () => {
          await actorTodoHelper.delete(`delete${modelName}`, { id: todoRandom.id });
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(0);
    });

    test('Admin user can give access to another group of users', async () => {
      const modelName = 'TodoGroupFieldList';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[userPoolProvider][userName2], schema);
      const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
      const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

      const todo = {
        content: 'Todo',
        groupsField: [adminGroupName, devGroupName],
      };
      const resultSetName = `create${modelName}`;
      const createResult = await todoHelperAdmin.create(resultSetName, todo);
      expect(createResult.data[resultSetName].id).toBeDefined();
      todo['id'] = createResult.data[resultSetName].id;

      const todoUpdated = {
        id: todo['id'],
        content: 'Todo updated',
        groupsField: [adminGroupName, devGroupName],
      };
      const updateResult = await todoHelperNonAdmin.update(`update${modelName}`, todoUpdated);
      checkOperationResult(updateResult, todoUpdated, `update${modelName}`);

      const getResult = await todoHelperNonAdmin.get({
        id: todo['id'],
      });
      checkOperationResult(getResult, todoUpdated, `get${modelName}`);

      const listTodosResult = await todoHelperNonAdmin.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id'], true);

      const deleteResult = await todoHelperNonAdmin.delete(`delete${modelName}`, {
        id: todo['id'],
      });
      checkOperationResult(deleteResult, todoUpdated, `delete${modelName}`);

      const todoRandom = {
        id: Date.now().toString(),
        content: 'Todo',
        groupsField: [adminGroupName, devGroupName],
      };
      const todoRandomUpdated = {
        ...todoRandom,
        content: 'Todo updated',
      };
      const actorClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName1]);
      const observerClient = getConfiguredAppsyncClientCognitoAuth(graphQlEndpoint, region, userMap[userName2]);
      const actorTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];
      const observerTodoHelper = createModelOperationHelpers(observerClient, schema)[modelName];

      const onCreateSubscriptionResult = await observerTodoHelper.subscribe('onCreate', [
        async () => {
          await actorTodoHelper.create(`create${modelName}`, todoRandom);
        },
      ]);
      expect(onCreateSubscriptionResult).toHaveLength(1);
      checkOperationResult(onCreateSubscriptionResult[0], todoRandom, `onCreate${modelName}`);
      const onUpdateSubscriptionResult = await observerTodoHelper.subscribe('onUpdate', [
        async () => {
          await actorTodoHelper.update(`update${modelName}`, todoRandomUpdated);
        },
      ]);
      expect(onUpdateSubscriptionResult).toHaveLength(1);
      checkOperationResult(onUpdateSubscriptionResult[0], todoRandomUpdated, `onUpdate${modelName}`);
      const onDeleteSubscriptionResult = await observerTodoHelper.subscribe('onDelete', [
        async () => {
          await actorTodoHelper.delete(`delete${modelName}`, { id: todoRandom.id });
        },
      ]);
      expect(onDeleteSubscriptionResult).toHaveLength(1);
      checkOperationResult(onDeleteSubscriptionResult[0], todoRandomUpdated, `onDelete${modelName}`);
    });

    test('logged in user can perform custom operations', async () => {
      const appSyncClient = appSyncClients[userPoolProvider][userName2];
      const todo = {
        id: Date.now().toString(),
        content: 'Todo',
      };
      const createTodoCustom = /* GraphQL */ `
        mutation CreateTodoCustom($id: ID!, $content: String) {
          addTodoPrivate(id: $id, content: $content) {
            id
            content
          }
        }
      `;
      const createResult = await appSyncClient.mutate({
        mutation: gql(createTodoCustom),
        fetchPolicy: 'no-cache',
        variables: todo,
      });
      expect(createResult.data.addTodoPrivate).toBeDefined();

      const getTodoCustom = /* GraphQL */ `
        query GetTodoCustom($id: ID!) {
          customGetTodoPrivate(id: $id) {
            id
            content
          }
        }
      `;
      const getResult = await appSyncClient.query({
        query: gql(getTodoCustom),
        fetchPolicy: 'no-cache',
        variables: {
          id: todo.id,
        },
      });
      expect(getResult.data.customGetTodoPrivate).toHaveLength(1);
      expect(getResult.data.customGetTodoPrivate[0].id).toEqual(todo.id);
      expect(getResult.data.customGetTodoPrivate[0].content).toEqual(todo.content);
    });

    test('users in static group can perform custom operations', async () => {
      const appSyncClient = appSyncClients[userPoolProvider][userName1];
      const todo = {
        id: Date.now().toString(),
        content: 'Todo',
      };
      const createTodoCustom = /* GraphQL */ `
        mutation CreateTodoCustom($id: ID!, $content: String) {
          addTodoStaticGroup(id: $id, content: $content) {
            id
            content
          }
        }
      `;
      const createResult = await appSyncClient.mutate({
        mutation: gql(createTodoCustom),
        fetchPolicy: 'no-cache',
        variables: todo,
      });
      expect(createResult.data.addTodoStaticGroup).toBeDefined();

      const getTodoCustom = /* GraphQL */ `
        query GetTodoCustom($id: ID!) {
          customGetTodoStaticGroup(id: $id) {
            id
            content
          }
        }
      `;
      const getResult = await appSyncClient.query({
        query: gql(getTodoCustom),
        fetchPolicy: 'no-cache',
        variables: {
          id: todo.id,
        },
      });
      expect(getResult.data.customGetTodoStaticGroup).toHaveLength(1);
      expect(getResult.data.customGetTodoStaticGroup[0].id).toEqual(todo.id);
      expect(getResult.data.customGetTodoStaticGroup[0].content).toEqual(todo.content);
    });

    test('users not in static group cannot perform custom operations', async () => {
      const appSyncClient = appSyncClients[userPoolProvider][userName2];
      const todo = {
        id: Date.now().toString(),
        content: 'Todo',
      };
      const createTodoCustom = /* GraphQL */ `
        mutation CreateTodoCustom($id: ID!, $content: String) {
          addTodoStaticGroup(id: $id, content: $content) {
            id
            content
          }
        }
      `;
      await expect(async () => {
        await appSyncClient.mutate({
          mutation: gql(createTodoCustom),
          fetchPolicy: 'no-cache',
          variables: todo,
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access addTodoStaticGroup on type Mutation"`);

      const getTodoCustom = /* GraphQL */ `
        query GetTodoCustom($id: ID!) {
          customGetTodoStaticGroup(id: $id) {
            id
            content
          }
        }
      `;
      await expect(async () => {
        await appSyncClient.query({
          query: gql(getTodoCustom),
          fetchPolicy: 'no-cache',
          variables: {
            id: todo.id,
          },
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access customGetTodoStaticGroup on type Query"`);
    });

    test('multiple dynamic auth rule model should respect owner rule when groups field is null', async () => {
      const modelName = 'TodoOwnerAndGroup';
      const modelHelper = createModelOperationHelpers(appSyncClients[userPoolProvider][userName1], schema)[modelName];
      const todo = {
        id: Date.now().toString(),
        content: 'Todo',
        groupsField: null,
        owners: [userName1],
      };
      const createResult = await modelHelper.create(`create${modelName}`, todo);
      expect(createResult.data.createTodoOwnerAndGroup).toBeDefined();
      expect(createResult.data.createTodoOwnerAndGroup.id).toEqual(todo.id);
      expect(createResult.data.createTodoOwnerAndGroup.content).toEqual(todo.content);
      expect(createResult.data.createTodoOwnerAndGroup.groupsField).toEqual(null);
      expect(createResult.data.createTodoOwnerAndGroup.owners).toBeDefined();
      expect(createResult.data.createTodoOwnerAndGroup.owners).toHaveLength(1);

      const updatedTodo = {
        id: todo.id,
        content: 'Todo-Updated',
      };
      const updateResult = await modelHelper.update(`update${modelName}`, updatedTodo);
      expect(updateResult.data.updateTodoOwnerAndGroup).toBeDefined();
      expect(updateResult.data.updateTodoOwnerAndGroup.id).toEqual(updatedTodo.id);
      expect(updateResult.data.updateTodoOwnerAndGroup.content).toEqual(updatedTodo.content);
      expect(updateResult.data.updateTodoOwnerAndGroup.groupsField).toEqual(null);
      expect(updateResult.data.updateTodoOwnerAndGroup.owners).toBeDefined();
      expect(updateResult.data.updateTodoOwnerAndGroup.owners).toHaveLength(1);

      const getResult = await modelHelper.get({
        id: updatedTodo.id,
      });
      expect(getResult.data.getTodoOwnerAndGroup).toBeDefined();
      expect(getResult.data.getTodoOwnerAndGroup.id).toEqual(updatedTodo.id);
      expect(getResult.data.getTodoOwnerAndGroup.content).toEqual(updatedTodo.content);
      expect(getResult.data.getTodoOwnerAndGroup.groupsField).toEqual(null);
      expect(getResult.data.getTodoOwnerAndGroup.owners).toBeDefined();
      expect(getResult.data.getTodoOwnerAndGroup.owners).toHaveLength(1);
    });
  });
};

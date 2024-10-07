import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { AUTH_TYPE } from 'aws-appsync';
import { gql } from 'graphql-tag';
import { schema as generateSchema } from './tests-sources/sql-userpool-auth/provider';
import { CognitoUserPoolAuthHelper } from '../utils/sql-cognito-helper';
import { configureAppSyncClients } from '../utils/sql-appsync-client-helper';
import {
  createModelOperationHelpers,
  checkOperationResult,
  checkListItemExistence,
} from '../utils/appsync-model-operation/model-operation-helper';
import { TestOptions, setupTest, cleanupTest } from '../utils/sql-test-config-helper';
import { stackConfig as generateStackConfig } from './tests-sources/sql-userpool-auth/stack-config';
import { authConstructDependency } from '../__tests__/additional-dependencies';

export const testGraphQLAPIWithUserPoolAccess = (options: TestOptions, testBlockDescription: string, engine: ImportedRDSType): void => {
  describe(`${testBlockDescription} - ${engine}`, () => {
    const schema = generateSchema(engine);
    const authProvider = AUTH_TYPE.AMAZON_COGNITO_USER_POOLS;

    const userName1 = 'user1@amazon.com';
    const userName2 = 'user2@amazon.com';
    const password = 'Password1234!';
    const adminGroupName = 'Admin';
    const devGroupName = 'Dev';

    let userMap = {};
    let appSyncClients = {};
    let testConfigOutput;

    beforeAll(async () => {
      testConfigOutput = await setupTest({
        options,
        stackConfig: generateStackConfig(engine),
        additionalDependencies: [authConstructDependency],
      });

      // const authHelper = new CognitoUserPoolAuthHelper(testConfigOutput as UserPoolAuthConstructStackOutputs);
      // await authHelper.createUser({ username: userName1, email: userName1, password }, [adminGroupName]);
      // await authHelper.createUser({ username: userName2, email: userName2, password }, [devGroupName]);

      // userMap[userName1] = await authHelper.getAuthRoleCredentials({ username: userName1, password });
      // userMap[userName2] = await authHelper.getAuthRoleCredentials({ username: userName2, password });

      appSyncClients = await configureAppSyncClients(testConfigOutput, userMap);
    });

    afterAll(async () => {
      await cleanupTest(testConfigOutput);
    });

    test('logged in user can perform CRUD and subscription operations', async () => {
      const modelName = 'TodoPrivate';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
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

      // const todoRandom = {
      //   id: Date.now().toString(),
      //   content: 'Todo',
      // };
      // const todoRandomUpdated = {
      //   ...todoRandom,
      //   content: 'Todo updated',
      // };
      // const actorClient = getConfiguredAppsyncClientCognitoAuth(awsAppsyncApiEndpoint, region, userMap[userName1]);
      // const subTodoHelper = createModelOperationHelpers(actorClient, schema)[modelName];

      // const onCreateSubscriptionResult = await subTodoHelper.subscribe('onCreate', [
      //   async () => {
      //     await subTodoHelper.create(`create${modelName}`, todoRandom);
      //   },
      // ]);
      // expect(onCreateSubscriptionResult).toHaveLength(1);
      // checkOperationResult(onCreateSubscriptionResult[0], todoRandom, `onCreate${modelName}`);
      // const onUpdateSubscriptionResult = await subTodoHelper.subscribe('onUpdate', [
      //   async () => {
      //     await subTodoHelper.update(`update${modelName}`, todoRandomUpdated);
      //   },
      // ]);
      // expect(onUpdateSubscriptionResult).toHaveLength(1);
      // checkOperationResult(onUpdateSubscriptionResult[0], todoRandomUpdated, `onUpdate${modelName}`);
      // const onDeleteSubscriptionResult = await subTodoHelper.subscribe('onDelete', [
      //   async () => {
      //     await subTodoHelper.delete(`delete${modelName}`, { id: todoRandom.id });
      //   },
      // ]);
      // expect(onDeleteSubscriptionResult).toHaveLength(1);
      // checkOperationResult(onDeleteSubscriptionResult[0], todoRandomUpdated, `onDelete${modelName}`);
    });

    test('owner of a record can perform CRUD operations using default owner field', async () => {
      const modelName = 'TodoOwner';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
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
    });

    test('non-owner of a record cannot access it using default owner field', async () => {
      const modelName = 'TodoOwner';
      const modelOperationHelpersOwner = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
      const modelOperationHelpersNonOwner = createModelOperationHelpers(appSyncClients[authProvider][userName2], schema);
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
    });

    test('custom owner field used to store owner information', async () => {
      const modelName = 'TodoOwnerFieldString';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
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
    });

    test('non-owner of a record cannot pretend to be an owner and gain access', async () => {
      const modelName = 'TodoOwnerFieldString';
      const modelOperationHelpersOwner = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
      const modelOperationHelpersNonOwner = createModelOperationHelpers(appSyncClients[authProvider][userName2], schema);
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
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwnerFieldString on type Query"`);

      const listTodosResult = await todoHelperNonOwner.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

      await expect(async () => {
        await todoHelperNonOwner.delete(`delete${modelName}`, {
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"GraphQL error: Not Authorized to access deleteTodoOwnerFieldString on type Mutation"`,
      );
    });

    test('member in list of owners can perform CRUD and subscription operations', async () => {
      const modelName = 'TodoOwnerFieldList';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
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
    });

    test('non-owner of a record cannot add themself to owner list', async () => {
      const modelName = 'TodoOwnerFieldList';
      const modelOperationHelpersOwner = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
      const modelOperationHelpersNonOwner = createModelOperationHelpers(appSyncClients[authProvider][userName2], schema);
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
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwnerFieldList on type Query"`);

      const listTodosResult = await todoHelperNonOwner.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

      await expect(async () => {
        await todoHelperNonOwner.delete(`delete${modelName}`, {
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access deleteTodoOwnerFieldList on type Mutation"`);
    });

    test('owner can add another user to the owner list', async () => {
      const modelName = 'TodoOwnerFieldList';
      const modelOperationHelpersOwner = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
      const modelOperationHelpersNonOwner = createModelOperationHelpers(appSyncClients[authProvider][userName2], schema);
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
    });

    test('users in static group can perform CRUD and subscription operations', async () => {
      const modelName = 'TodoStaticGroup';
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
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
    });

    test('users not in static group cannot perform CRUD operations', async () => {
      const modelName = 'TodoStaticGroup';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[authProvider][userName2], schema);
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
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
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
    });

    test('users cannot spoof their group membership and gain access', async () => {
      const modelName = 'TodoGroupFieldString';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[authProvider][userName2], schema);
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
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoGroupFieldString on type Query"`);

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
      const modelOperationHelpers = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
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
    });

    test('users not part of allowed groups cannot access the records or modify allowed groups', async () => {
      const modelName = 'TodoGroupFieldList';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[authProvider][userName2], schema);
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
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoGroupFieldList on type Query"`);

      const listTodosResult = await todoHelperNonAdmin.list();
      checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

      await expect(async () => {
        await todoHelperNonAdmin.delete(`delete${modelName}`, {
          id: todo['id'],
        });
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access deleteTodoGroupFieldList on type Mutation"`);
    });

    test('Admin user can give access to another group of users', async () => {
      const modelName = 'TodoGroupFieldList';
      const modelOperationHelpersAdmin = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
      const modelOperationHelpersNonAdmin = createModelOperationHelpers(appSyncClients[authProvider][userName2], schema);
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
    });

    test('logged in user can perform custom operations', async () => {
      const appSyncClient = appSyncClients[authProvider][userName2];
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
      const appSyncClient = appSyncClients[authProvider][userName1];
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
      const appSyncClient = appSyncClients[authProvider][userName2];
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
      const modelHelper = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema)[modelName];
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

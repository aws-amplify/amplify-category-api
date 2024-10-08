import { AUTH_TYPE } from 'aws-appsync';
import { gql } from 'graphql-tag';
import { TestConfigOutput } from '../../../utils/sql-test-config-helper';
import { AppSyncClients, configureAppSyncClients } from '../../../utils/sql-appsync-client-helper';
import { getUserMap } from '../../../utils/sql-cognito-helper';
import {
  createModelOperationHelpers,
  checkOperationResult,
  checkListItemExistence,
} from '../../../utils/appsync-model-operation/model-operation-helper';

export class DynamicModelAuthTester {
  private readonly testConfigOutput: TestConfigOutput;

  private readonly schema: string;
  private readonly authProvider: AUTH_TYPE;

  private appSyncClients: AppSyncClients;

  private userName1: string;
  private userName2: string;
  private groupName1: string;
  private groupName2: string;

  constructor(testConfigOutput: TestConfigOutput) {
    this.testConfigOutput = testConfigOutput;

    this.schema = this.testConfigOutput.schema;
    this.authProvider = this.testConfigOutput.authType;
  }

  public initialize = async (): Promise<void> => {
    const userMap = await getUserMap(this.testConfigOutput);
    this.appSyncClients = await configureAppSyncClients(this.testConfigOutput, userMap);

    this.userName1 = Object.keys(userMap)[0];
    this.userName2 = Object.keys(userMap)[1];
    this.groupName1 = this.testConfigOutput.userGroups[0];
    this.groupName2 = this.testConfigOutput.userGroups[1];
  };

  public testLoggedInUserCrudOperations = async (): Promise<void> => {
    const modelName = 'TodoPrivate';
    const modelOperationHelpers = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
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
  };

  public testRecordOwnerCrudOperationsWithDefaultOwnerField = async (): Promise<void> => {
    const modelName = 'TodoOwner';
    const modelOperationHelpers = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
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
      owner: createResult.data[resultSetName].owner,
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
  };

  public testNonRecordOwnerCannotAccessWithDefaultOwnerField = async (): Promise<void> => {
    const modelName = 'TodoOwner';
    const modelOperationHelpersOwner = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const modelOperationHelpersNonOwner = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName2], this.schema);
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
      owner: this.userName2,
    };
    await expect(todoHelperNonOwner.update(`update${modelName}`, todoUpdated)).rejects.toThrow(
      'GraphQL error: Not Authorized to access updateTodoOwner on type Mutation',
    );

    await expect(async () => {
      const getResult = await todoHelperNonOwner.get({
        id: todo['id'],
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwner on type Query"`);

    const listTodosResult = await todoHelperNonOwner.list();
    checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

    await expect(
      todoHelperNonOwner.delete(`delete${modelName}`, {
        id: todo['id'],
      }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access deleteTodoOwner on type Mutation');
  };

  public testStoreOwnerInCustomField = async (): Promise<void> => {
    const modelName = 'TodoOwnerFieldString';
    const modelOperationHelpers = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo = {
      content: 'Todo',
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;
    expect(createResult.data[resultSetName].content).toEqual(todo.content);
    expect(createResult.data[resultSetName].author).toEqual(this.userName1);

    const todoWithOwner = {
      ...todo,
      author: this.userName1,
    };

    const todo1Updated = {
      id: todo['id'],
      content: 'Todo updated',
      author: todoWithOwner.author,
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
  };

  public testNonOwnerCannotPretendToBeOwner = async (): Promise<void> => {
    const modelName = 'TodoOwnerFieldString';
    const modelOperationHelpersOwner = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const modelOperationHelpersNonOwner = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName2], this.schema);
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
      author: this.userName1,
    };
    await expect(todoHelperNonOwner.update(`update${modelName}`, todoUpdated)).rejects.toThrow(
      'GraphQL error: Not Authorized to access updateTodoOwnerFieldString on type Mutation',
    );

    await expect(async () => {
      const getResult = await todoHelperNonOwner.get({
        id: todo['id'],
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwnerFieldString on type Query"`);

    const listTodosResult = await todoHelperNonOwner.list();
    checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

    await expect(
      todoHelperNonOwner.delete(`delete${modelName}`, {
        id: todo['id'],
      }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access deleteTodoOwnerFieldString on type Mutation');
  };

  public testListOwnersMemberCrudOperations = async (): Promise<void> => {
    const modelName = 'TodoOwnerFieldList';
    const modelOperationHelpers = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo = {
      content: 'Todo',
      authors: [this.userName1],
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;
    expect(createResult.data[resultSetName].content).toEqual(todo.content);
    expect(createResult.data[resultSetName].authors).toEqual([this.userName1]);

    const todoUpdated = {
      id: todo['id'],
      content: 'Todo updated',
      authors: [this.userName1],
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
  };

  public testNonOwnerCannotAddThemselvesToList = async (): Promise<void> => {
    const modelName = 'TodoOwnerFieldList';
    const modelOperationHelpersOwner = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const modelOperationHelpersNonOwner = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName2], this.schema);
    const todoHelperOwner = modelOperationHelpersOwner[modelName];
    const todoHelperNonOwner = modelOperationHelpersNonOwner[modelName];

    const todo = {
      content: 'Todo',
      authors: [this.userName1],
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelperOwner.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;

    const todoUpdated = {
      id: todo['id'],
      content: 'Todo updated',
      authors: [this.userName1, this.userName2],
    };
    await expect(todoHelperNonOwner.update(`update${modelName}`, todoUpdated)).rejects.toThrow(
      'GraphQL error: Not Authorized to access updateTodoOwnerFieldList on type Mutation',
    );

    await expect(async () => {
      const getResult = await todoHelperNonOwner.get({
        id: todo['id'],
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoOwnerFieldList on type Query"`);

    const listTodosResult = await todoHelperNonOwner.list();
    checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

    await expect(
      todoHelperNonOwner.delete(`delete${modelName}`, {
        id: todo['id'],
      }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access deleteTodoOwnerFieldList on type Mutation');
  };

  public testOwnerCanAddAnotherUserToList = async (): Promise<void> => {
    const modelName = 'TodoOwnerFieldList';
    const modelOperationHelpersOwner = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const modelOperationHelpersNonOwner = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName2], this.schema);
    const todoHelperOwner = modelOperationHelpersOwner[modelName];
    const todoHelperAnotherOwner = modelOperationHelpersNonOwner[modelName];

    const todo = {
      content: 'Todo',
      authors: [this.userName1, this.userName2],
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelperOwner.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;

    const todoUpdated = {
      id: todo['id'],
      content: 'Todo updated',
      authors: [this.userName1, this.userName2],
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
  };

  public testStaticGroupUserCrudOperations = async (): Promise<void> => {
    const modelName = 'TodoStaticGroup';
    const modelOperationHelpers = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
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
  };

  public testNonStaticGroupUserCrudOperations = async (): Promise<void> => {
    const modelName = 'TodoStaticGroup';
    const modelOperationHelpersAdmin = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const modelOperationHelpersNonAdmin = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName2], this.schema);
    const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
    const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

    const todo = {
      content: 'Todo',
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelperAdmin.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;

    await expect(todoHelperNonAdmin.create(`create${modelName}`, todo)).rejects.toThrow(
      'GraphQL error: Not Authorized to access createTodoStaticGroup on type Mutation',
    );

    const todoUpdated = {
      id: todo['id'],
      content: 'Todo updated',
    };
    await expect(todoHelperNonAdmin.update(`update${modelName}`, todoUpdated)).rejects.toThrow(
      'GraphQL error: Not Authorized to access updateTodoStaticGroup on type Mutation',
    );

    expect(
      todoHelperNonAdmin.get({
        id: todo['id'],
      }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access getTodoStaticGroup on type Query');

    await expect(todoHelperNonAdmin.list()).rejects.toThrow('GraphQL error: Not Authorized to access listTodoStaticGroups on type Query');

    await expect(
      todoHelperNonAdmin.delete(`delete${modelName}`, {
        id: todo['id'],
      }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access deleteTodoStaticGroup on type Mutation');
  };

  public testGroupUserCrudOperations = async (): Promise<void> => {
    const modelName = 'TodoGroupFieldString';
    const modelOperationHelpers = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo = {
      content: 'Todo',
      groupField: this.groupName1,
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;
    expect(createResult.data[resultSetName].content).toEqual(todo.content);
    expect(createResult.data[resultSetName].groupField).toEqual(this.groupName1);

    const todoUpdated = {
      id: todo['id'],
      content: 'Todo updated',
      groupField: this.groupName1,
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
  };

  public testUsersCannotSpoofGroupMembership = async (): Promise<void> => {
    const modelName = 'TodoGroupFieldString';
    const modelOperationHelpersAdmin = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const modelOperationHelpersNonAdmin = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName2], this.schema);
    const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
    const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

    const todo = {
      content: 'Todo',
      groupField: this.groupName1,
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelperAdmin.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;

    await expect(todoHelperNonAdmin.create(resultSetName, todo)).rejects.toThrow(
      'GraphQL error: Not Authorized to access createTodoGroupFieldString on type Mutation',
    );

    const todoUpdated = {
      id: todo['id'],
      content: 'Todo updated',
      groupField: this.groupName2,
    };
    await expect(todoHelperNonAdmin.update(`update${modelName}`, todoUpdated)).rejects.toThrow(
      'GraphQL error: Not Authorized to access updateTodoGroupFieldString on type Mutation',
    );

    await expect(async () => {
      const getResult = await todoHelperNonAdmin.get({
        id: todo['id'],
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoGroupFieldString on type Query"`);

    const listTodosResult = await todoHelperNonAdmin.list();
    checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

    await expect(
      todoHelperNonAdmin.delete(`delete${modelName}`, {
        id: todo['id'],
      }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access deleteTodoGroupFieldString on type Mutation');
  };

  public testListGroupUserCrudOperations = async (): Promise<void> => {
    const modelName = 'TodoGroupFieldList';
    const modelOperationHelpers = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const todoHelper = modelOperationHelpers[modelName];

    const todo = {
      content: 'Todo',
      groupsField: [this.groupName1],
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelper.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;
    expect(createResult.data[resultSetName].content).toEqual(todo.content);
    expect(createResult.data[resultSetName].groupsField).toEqual([this.groupName1]);

    const todo1Updated = {
      id: todo['id'],
      content: 'Todo updated',
      groupsField: [this.groupName1],
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
  };

  public testNotAllowedGroupUserCannotAccess = async (): Promise<void> => {
    const modelName = 'TodoGroupFieldList';
    const modelOperationHelpersAdmin = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const modelOperationHelpersNonAdmin = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName2], this.schema);
    const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
    const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

    const todo = {
      content: 'Todo',
      groupsField: [this.groupName1],
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelperAdmin.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;

    const todoUpdated = {
      id: todo['id'],
      content: 'Todo updated',
      groupsField: [this.groupName1, this.groupName2],
    };
    await expect(todoHelperNonAdmin.update(`update${modelName}`, todoUpdated)).rejects.toThrow(
      'GraphQL error: Not Authorized to access updateTodoGroupFieldList on type Mutation',
    );

    await expect(async () => {
      const getResult = await todoHelperNonAdmin.get({
        id: todo['id'],
      });
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getTodoGroupFieldList on type Query"`);

    const listTodosResult = await todoHelperNonAdmin.list();
    checkListItemExistence(listTodosResult, `list${modelName}s`, todo['id']);

    await expect(
      todoHelperNonAdmin.delete(`delete${modelName}`, {
        id: todo['id'],
      }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access deleteTodoGroupFieldList on type Mutation');
  };

  public testAdminUserCanGiveAccessToAnotherUserGroup = async (): Promise<void> => {
    const modelName = 'TodoGroupFieldList';
    const modelOperationHelpersAdmin = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema);
    const modelOperationHelpersNonAdmin = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName2], this.schema);
    const todoHelperAdmin = modelOperationHelpersAdmin[modelName];
    const todoHelperNonAdmin = modelOperationHelpersNonAdmin[modelName];

    const todo = {
      content: 'Todo',
      groupsField: [this.groupName1, this.groupName2],
    };
    const resultSetName = `create${modelName}`;
    const createResult = await todoHelperAdmin.create(resultSetName, todo);
    expect(createResult.data[resultSetName].id).toBeDefined();
    todo['id'] = createResult.data[resultSetName].id;

    const todoUpdated = {
      id: todo['id'],
      content: 'Todo updated',
      groupsField: [this.groupName1, this.groupName2],
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
  };

  public testLoggedInUserCustomOperations = async (): Promise<void> => {
    const appSyncClient = this.appSyncClients[this.authProvider][this.userName2];
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
  };

  public testStaticGroupUserCustomOperations = async (): Promise<void> => {
    const appSyncClient = this.appSyncClients[this.authProvider][this.userName1];
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
  };

  public testNonStaticGroupUserCustomOperations = async (): Promise<void> => {
    const appSyncClient = this.appSyncClients[this.authProvider][this.userName2];
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
    await expect(
      appSyncClient.mutate({
        mutation: gql(createTodoCustom),
        fetchPolicy: 'no-cache',
        variables: todo,
      }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access addTodoStaticGroup on type Mutation');

    const getTodoCustom = /* GraphQL */ `
      query GetTodoCustom($id: ID!) {
        customGetTodoStaticGroup(id: $id) {
          id
          content
        }
      }
    `;
    await expect(
      appSyncClient.query({
        query: gql(getTodoCustom),
        fetchPolicy: 'no-cache',
        variables: {
          id: todo.id,
        },
      }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access customGetTodoStaticGroup on type Query');
  };

  public testOwnerRileWithNullGroupsFieldAndMultipleDynamicAuth = async (): Promise<void> => {
    const modelName = 'TodoOwnerAndGroup';
    const modelHelper = createModelOperationHelpers(this.appSyncClients[this.authProvider][this.userName1], this.schema)[modelName];
    const todo = {
      id: Date.now().toString(),
      content: 'Todo',
      groupsField: null,
      owners: [this.userName1],
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
  };
}

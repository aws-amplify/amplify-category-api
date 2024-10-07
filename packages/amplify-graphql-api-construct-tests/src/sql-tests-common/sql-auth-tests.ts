import { AUTH_TYPE } from 'aws-appsync';
import { AppSyncClients } from '../utils/sql-appsync-client-helper';
import { UserMap } from '../utils/sql-cognito-helper';
import {
  createModelOperationHelpers,
  checkOperationResult,
  checkListItemExistence,
} from '../utils/appsync-model-operation/model-operation-helper';

export interface TestInput {
  appSyncClients: AppSyncClients;
  userMap: UserMap;
  authProvider: AUTH_TYPE;
  schema: string;
}

export const loggedInUserCrudOperationsTest = async (testInput: TestInput): Promise<void> => {
  const { appSyncClients, userMap, authProvider, schema } = testInput;

  const userName1 = Object.keys(userMap)[0];

  const modelName = 'TodoPrivate';
  const modelOperationHelpers = createModelOperationHelpers(appSyncClients[authProvider][userName1], schema);
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

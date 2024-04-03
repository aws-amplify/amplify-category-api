import * as path from 'path';
import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import { initCDKProject, cdkDeploy } from '../commands';
import { graphql } from '../graphql-request';
import { SqlDatatabaseController } from '../sql-datatabase-controller';

export const testGraphQLAPI = async (options: {
  projRoot: string;
  region: string;
  connectionConfigName: string;
  dbController: SqlDatatabaseController;
  resourceNames: { sqlLambdaAliasName: string };
}): Promise<void> => {
  const templatePath = path.resolve(path.join(__dirname, 'backends', 'sql-models'));
  const { projRoot, region, connectionConfigName, dbController, resourceNames } = options;
  const name = await initCDKProject(projRoot, templatePath);
  dbController.writeDbDetails(projRoot, connectionConfigName);
  const outputs = await cdkDeploy(projRoot, '--all');
  const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

  const description = 'todo description';

  const result = await graphql(
    apiEndpoint,
    apiKey,
    /* GraphQL */ `
      mutation CREATE_TODO {
        createTodo(input: { description: "${description}" }) {
          id
          description
        }
      }
    `,
  );

  const todo = result.body.data.createTodo;
  expect(todo).toBeDefined();
  expect(todo.id).toBeDefined();
  expect(todo.description).toEqual(description);

  const listResult = await graphql(
    apiEndpoint,
    apiKey,
    /* GraphQL */ `
      query LIST_TODOS {
        listTodos {
          items {
            id
            description
          }
        }
      }
    `,
  );

  expect(listResult.body.data.listTodos.items.length).toEqual(1);
  expect(todo.id).toEqual(listResult.body.data.listTodos.items[0].id);
  const client = new LambdaClient({ region });
  const functionName = outputs[name].SQLFunctionName;
  const command = new GetProvisionedConcurrencyConfigCommand({
    FunctionName: functionName,
    Qualifier: resourceNames.sqlLambdaAliasName,
  });
  const response = await client.send(command);
  expect(response.RequestedProvisionedConcurrentExecutions).toEqual(2);

  await graphql(
    apiEndpoint,
    apiKey,
    /* GraphQL */ `
        mutation DELETE_TODO {
          deleteTodo(input: { id: "${todo.id}" }) {
            id
          }
        }
      `,
  );
  const emptyListResult = await graphql(
    apiEndpoint,
    apiKey,
    /* GraphQL */ `
      query LIST_TODOS {
        listTodos {
          items {
            id
            description
          }
        }
      }
    `,
  );

  expect(emptyListResult.body.data.listTodos.items.length).toEqual(0);
};

import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import generator from 'generate-password';
import { getResourceNamesForStrategyName } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';
import { SqlDatatabaseController } from '../sql-datatabase-controller';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK GraphQL Transformer', () => {
  let projRoot: string;
  const projFolderName = 'sqlmodelsssm';

  const [username, identifier] = generator.generateMultiple(2);

  const region = process.env.CLI_REGION ?? 'us-west-2';

  const dbname = 'default_db';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(
    ['CREATE TABLE todos (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))'],
    {
      identifier,
      engine: 'mysql',
      dbname,
      username,
      region,
    },
  );

  // DO NOT CHANGE THIS VALUE: The test uses it to find resources by name. It is hardcoded in the sql-models backend app
  const strategyName = 'MySqlDBStrategy';
  const resourceNames = getResourceNamesForStrategyName(strategyName);

  beforeAll(async () => {
    await databaseController.setupDatabase();
  });

  afterAll(async () => {
    await databaseController.cleanupDatabase();
  });

  beforeEach(async () => {
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (err) {
      console.log(`Error invoking 'cdk destroy': ${err}`);
    }

    deleteProjectDir(projRoot);
  });

  test('creates a GraphQL API from SQL-based models with Secrets Manager Credential Store default encryption key', async () => {
    await testGraphQLAPI('secretsManager');
  });

  test('creates a GraphQL API from SQL-based models with Secrets Manager Credential Store custom encryption key', async () => {
    await testGraphQLAPI('secretsManagerCustomKey');
  });

  test('creates a GraphQL API from SQL-based models with Secrets Manager Credential Store default encryption key', async () => {
    await testGraphQLAPI('secretsManagerManagedSecret');
  });

  test('creates a GraphQL API from SQL-based models with SSM Credential Store', async () => {
    await testGraphQLAPI('ssm');
  });

  const testGraphQLAPI = async (connectionConfigName: string): Promise<void> => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'sql-models'));
    const name = await initCDKProject(projRoot, templatePath);
    databaseController.writeDbDetails(projRoot, connectionConfigName);
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
});

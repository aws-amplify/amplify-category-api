import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { initCDKProject, cdkDestroy, cdkDeploy } from '../commands';
import { TestDefinition, writeStackConfig, writeTestDefinitions, writeOverrides } from '../utils';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { graphql } from '../graphql-request';

jest.setTimeout(DURATION_1_HOUR);

describe('CFN Overrides', () => {
  describe('Amplify Managed Table', () => {
    const projFolderName = 'amplify-managed-table-overrides';
    let projRoot: string;

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

    test('allow override table name', async () => {
      const templatePath = path.resolve(path.join(__dirname, 'backends', 'configurable-stack'));
      const name = await initCDKProject(projRoot, templatePath);
      const testDefinitions: Record<string, TestDefinition> = {
        'table-name-override': {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID!
              content: String
            }
          `,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackConfig(projRoot, { prefix: projFolderName });
      writeTestDefinitions(testDefinitions, projRoot);
      const tableName = `CustomTableName-${Date.now()}`;
      const overrides = `
        import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';

        export const applyOverrides = (api: AmplifyGraphqlApi): void => {
          api.resources.cfnResources.amplifyDynamoDbTables['Todo'].tableName = '${tableName}';
        };
      `;
      writeOverrides(overrides, projRoot);
      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint, awsAppsyncApiKey } = outputs[name];
      // TODO: set region
      const ddbClient = new DynamoDBClient({ region: process.env.CLI_REGION || 'us-west-2' });
      const describeTableResponseBefore = await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
      expect(describeTableResponseBefore.Table?.TableName).toEqual(tableName);
      expect(describeTableResponseBefore.Table?.ItemCount).toEqual(0);

      const result = await graphql(
        awsAppsyncApiEndpoint,
        awsAppsyncApiKey,
        /* GraphQL */ `
          mutation CREATE_TODO {
            createTodo(input: { content: "todo desc" }) {
              id
              content
            }
          }
        `,
      );
      expect(result.statusCode).toEqual(200);
      const todo = result.body.data.createTodo;

      const listResult = await graphql(
        awsAppsyncApiEndpoint,
        awsAppsyncApiKey,
        /* GraphQL */ `
          query LIST_TODOS {
            listTodos {
              items {
                id
                content
              }
            }
          }
        `,
      );

      expect(listResult.statusCode).toEqual(200);
      expect(listResult.body.data.listTodos.items[0].id).toEqual(todo.id);

      const describeTableResponseAfter = await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
      expect(describeTableResponseAfter.Table?.TableName).toEqual(tableName);
      expect(describeTableResponseAfter.Table?.ItemCount).toEqual(1);
    });
  });
});

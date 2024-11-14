import * as path from 'path';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';
import { TestDefinition, writeStackConfig, writeTestDefinitions } from '../utils';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('Custom resolver', () => {
  let projRoot: string;
  let apiEndpoint: string;
  let apiKey: string;

  /**
   * Deploy the CDK App before running our test suite.
   * Persist the Endpoint+ApiKey so we can make queries against it.
   */
  beforeAll(async () => {
    projRoot = await createNewProjectDir('customresolver');
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'configurable-stack'));
    const testDefinitions: Record<string, TestDefinition> = {
      'custom-resolver': {
        schema: /* GraphQL */ `
          type Todo @model {
            name: String!
          }
          type Query {
            getFoo(bar: Int): String @resolver(functions: [{ dataSource: "Todo", entry: "src/__tests__/__functional__/handler.js" }])
          }
        `,
        strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      },
    };
    const name = await initCDKProject(projRoot, templatePath);
    writeStackConfig(projRoot, { prefix: 'customresolver' });
    writeTestDefinitions(testDefinitions, projRoot);
    const outputs = await cdkDeploy(projRoot, '--all');
    apiEndpoint = outputs[name].awsAppsyncApiEndpoint;
    apiKey = outputs[name].awsAppsyncApiKey;
  });

  /**
   * Destroy the Cloudformation Stack, and delete the local project directory.
   */
  afterAll(async () => {
    try {
      // await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    // deleteProjectDir(projRoot);
  });

  test('function directive can be used to reverse a string on a custom query', async () => {
    const reverseResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query REVERSE {
          reverse(message: "Hello, World!")
        }
      `,
    );
    expect(reverseResult.statusCode).toEqual(200);
    const reversedMessage = reverseResult.body.data.reverse;

    expect(reversedMessage).toBeDefined();
    expect(reversedMessage).toEqual('!dlroW ,olleH');
  });
});

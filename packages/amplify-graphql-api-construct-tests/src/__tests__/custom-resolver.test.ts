import * as path from 'path';
import { writeFileSync } from 'fs';
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
          type Todo @model @auth(rules: [{ allow: public }]) {
            name: String!
          }
          type Mutation {
            batchPutTodo(name: [String]!): String
              @resolver(functions: [{ dataSource: "Todo", entry: "handler.js" }])
              @auth(rules: [{ allow: public }])
          }
        `,
        strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      },
    };
    const name = await initCDKProject(projRoot, templatePath);
    writeStackConfig(projRoot, { prefix: 'customresolver' });
    writeTestDefinitions(testDefinitions, projRoot);
    writeFileSync(
      path.join(projRoot, 'handler.js'),
      `
        export function request(ctx) {
          var now = util.time.nowISO8601();
        
          return {
            operation: 'BatchPutItem',
            tables: {
              [ctx.stash.TodoTable]: ctx.args.names.map((name) =>
                util.dynamodb.toMapValues({
                  name,
                  id: util.autoId(),
                  createdAt: now,
                  updatedAt: now,
                }),
              ),
            },
          };
        }
        
        export function response(ctx) {
          if (ctx.error) {
            util.error(ctx.error.message, ctx.error.type);
          }
          return ctx.result.data[ctx.stash.Todo];
        }
      `,
    );
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

  test('custom resolvers can access tables', async () => {
    const batchPutResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query PutTodos {
          batchPutTodos(names: ["Todo1", "Todo2", "Todo3"])
        }
      `,
    );
    expect(batchPutResult.statusCode).toEqual(200);
    const message = batchPutResult.body.data.reverse;

    expect(message).toBeDefined();
    expect(message).toEqual('!dlroW ,olleH');
  });
});

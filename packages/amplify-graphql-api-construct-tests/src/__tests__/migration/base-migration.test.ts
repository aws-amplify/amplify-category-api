import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, deleteProject } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy, createGen1ProjectForMigration, deleteDDBTables } from '../../commands';
import { graphql } from '../../graphql-request';
import { TestDefinition, writeStackConfig, writeTestDefinitions, writeOverrides } from '../../utils';
import { DURATION_20_MINUTES } from '../../utils/duration-constants';

jest.setTimeout(DURATION_20_MINUTES);

describe('Migration with basic schema', () => {
  let gen1ProjRoot: string;
  let gen2ProjRoot: string;
  let gen1ProjFolderName: string;
  let gen2ProjFolderName: string;
  let dataSourceMapping: Record<string, string>;

  beforeEach(async () => {
    gen1ProjFolderName = 'basemigrationgen1';
    gen2ProjFolderName = 'basemigrationgen2';
    gen1ProjRoot = await createNewProjectDir(gen1ProjFolderName);
    gen2ProjRoot = await createNewProjectDir(gen2ProjFolderName);
  });

  afterEach(async () => {
    try {
      await deleteProject(gen1ProjRoot);
    } catch (_) {
      /* No-op */
    }
    try {
      await cdkDestroy(gen2ProjRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    try {
      // Tables are set to retain when migrating from gen 1 to gen 2
      // delete the tables to prevent resource leak after test is complete
      await deleteDDBTables(Object.values(dataSourceMapping));
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(gen1ProjRoot);
    deleteProjectDir(gen2ProjRoot);
  });

  test('Migration with basic schema', async () => {
    const {
      GraphQLAPIEndpointOutput: gen1APIEndpoint,
      GraphQLAPIKeyOutput: gen1APIKey,
      DataSourceMappingOutput,
    } = await createGen1ProjectForMigration(gen1ProjFolderName, gen1ProjRoot, 'simple_model_public_auth.graphql');
    dataSourceMapping = JSON.parse(DataSourceMappingOutput);
    const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'configurable-stack'));
    const name = await initCDKProject(gen2ProjRoot, templatePath);
    const testDefinitions: Record<string, TestDefinition> = {
      'basic-schema-migration': {
        schema: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            id: ID!
            content: String
          }
        `,
        strategy: {
          dbType: 'DYNAMODB' as const,
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
          tableName: dataSourceMapping.Todo,
        },
      },
    };
    writeStackConfig(gen2ProjRoot, { prefix: gen2ProjFolderName });
    writeTestDefinitions(testDefinitions, gen2ProjRoot);
    // use DynamoDB managed encryption
    const overrides = `
      import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';

      export const applyOverrides = (api: AmplifyGraphqlApi): void => {
        const todoTable = api.resources.cfnResources.additionalCfnResources['Todo'];
        todoTable.addOverride('Properties.sseSpecification', { sseEnabled: false });
      };
    `;
    writeOverrides(overrides, gen2ProjRoot);

    const outputs = await cdkDeploy(gen2ProjRoot, '--all');
    const { awsAppsyncApiEndpoint: gen2APIEndpoint, awsAppsyncApiKey: gen2APIKey } = outputs[name];

    const gen1Result = await graphql(
      gen1APIEndpoint,
      gen1APIKey,
      /* GraphQL */ `
        mutation CREATE_TODO {
          createTodo(input: { content: "todo desc" }) {
            id
            content
          }
        }
      `,
    );
    // the create mutations are later verified with list queries
    expect(gen1Result.statusCode).toEqual(200);

    const gen1Todo = gen1Result.body.data.createTodo;

    const gen2Result = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        mutation CREATE_TODO {
          createTodo(input: { content: "todo desc" }) {
            id
            content
          }
        }
      `,
    );
    expect(gen2Result.statusCode).toEqual(200);

    const gen2Todo = gen2Result.body.data.createTodo;

    const gen1ListResult = await graphql(
      gen1APIEndpoint,
      gen1APIKey,
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

    expect(gen1ListResult.statusCode).toEqual(200);
    expect(gen1ListResult.body.data.listTodos.items.length).toEqual(2);
    expect([gen1Todo.id, gen2Todo.id]).toContain(gen1ListResult.body.data.listTodos.items[0].id);
    expect([gen1Todo.id, gen2Todo.id]).toContain(gen1ListResult.body.data.listTodos.items[1].id);

    const gen2ListResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
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

    expect(gen2ListResult.statusCode).toEqual(200);
    expect(gen2ListResult.body.data.listTodos.items.length).toEqual(2);
    expect([gen1Todo.id, gen2Todo.id]).toContain(gen2ListResult.body.data.listTodos.items[0].id);
    expect([gen1Todo.id, gen2Todo.id]).toContain(gen2ListResult.body.data.listTodos.items[1].id);

    await deleteProject(gen1ProjRoot);

    // assert tables have not been deleted after deleting the gen 1 project

    // TODO: GEN1_GEN2_MIGRATION
    // The enablegen2migration feature flag is not released yet so the tables will be deleted when the gen 1 app is deleted
    // Restore this block when the feature flag is released
    // start block
    // const listResult = await graphql(
    //   gen2APIEndpoint,
    //   gen2APIKey,
    //   /* GraphQL */ `
    //     query LIST_TODOS {
    //       listTodos {
    //         items {
    //           id
    //           content
    //         }
    //       }
    //     }
    //   `,
    // );

    // expect(listResult.statusCode).toEqual(200);
    // expect(listResult.body.data.listTodos.items.length).toEqual(2);
    // expect([gen1Todo.id, gen2Todo.id]).toContain(listResult.body.data.listTodos.items[0].id);
    // expect([gen1Todo.id, gen2Todo.id]).toContain(listResult.body.data.listTodos.items[1].id);
    // end block
  });
});

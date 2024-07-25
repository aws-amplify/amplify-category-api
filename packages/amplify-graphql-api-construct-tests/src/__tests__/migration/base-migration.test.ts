import * as path from 'path';
import {
  createNewProjectDir,
  deleteProjectDir,
  deleteProject,
} from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy, createGen1ProjectForMigration, writeTableMap, deleteDDBTables } from '../../commands';
import { graphql } from '../../graphql-request';
import { DURATION_1_HOUR } from '../../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('Base Migration', () => {
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
      await deleteDDBTables(Object.values(dataSourceMapping));
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(gen1ProjRoot);
    deleteProjectDir(gen2ProjRoot);
  });

  test('base migration', async () => {
    const {
      GraphQLAPIEndpointOutput: gen1APIEndpoint,
      GraphQLAPIKeyOutput: gen1APIKey,
      DataSourceMappingOutput,
    } = await createGen1ProjectForMigration(gen1ProjFolderName, gen1ProjRoot, 'simple_model_public_auth.graphql');
    dataSourceMapping = JSON.parse(DataSourceMappingOutput);
    const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'migration', 'base'));
    const name = await initCDKProject(gen2ProjRoot, templatePath);
    writeTableMap(gen2ProjRoot, DataSourceMappingOutput);
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

    const listResult = await graphql(
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

    expect(listResult.statusCode).toEqual(200);
    expect(listResult.body.data.listTodos.items.length).toEqual(2);
    expect([gen1Todo.id, gen2Todo.id]).toContain(listResult.body.data.listTodos.items[0].id);
    expect([gen1Todo.id, gen2Todo.id]).toContain(listResult.body.data.listTodos.items[1].id);
  });
});

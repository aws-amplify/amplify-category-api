import * as path from 'path';
import * as fs from 'fs';
import {
  createNewProjectDir,
  deleteProjectDir,
  deleteProject,
  initJSProjectWithProfile,
  addApiWithoutSchema,
  updateApiSchema,
  amplifyPush,
  addFeatureFlag,
  getProjectMeta,
} from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../../commands';
import { graphql } from '../../graphql-request';
import { DURATION_1_HOUR } from '../../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

const createGen1Project = async (
  name: string,
  projRoot: string,
  schema: string,
): Promise<{
  GraphQLAPIEndpointOutput: string;
  GraphQLAPIKeyOutput: string;
  DataSourceMappingOutput: string;
}> => {
  await initJSProjectWithProfile(projRoot, { name });
  await addApiWithoutSchema(projRoot, { transformerVersion: 1 });
  await updateApiSchema(projRoot, name, schema);
  await amplifyPush(projRoot);
  addFeatureFlag(projRoot, 'graphqltransformer', 'enableGen2Migration', true);
  await amplifyPush(projRoot);

  const meta = getProjectMeta(projRoot);
  const { output } = meta.api[name];
  const { GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput, DataSourceMappingOutput } = output;

  return {
    GraphQLAPIEndpointOutput,
    GraphQLAPIKeyOutput,
    DataSourceMappingOutput,
  };
};

const writeTableMap = (projRoot: string, tableMap: string): void => {
  const filePath = path.join(projRoot, 'table-map.json');
  fs.writeFileSync(filePath, tableMap);
  console.log(`Wrote Table Mapping at ${filePath}`);
};

describe('Data Construct', () => {
  let gen1ProjRoot: string;
  let gen2ProjRoot: string;
  let gen1ProjFolderName: string;
  let gen2ProjFolderName: string;

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

    deleteProjectDir(gen1ProjRoot);
    deleteProjectDir(gen2ProjRoot);
  });

  test('base migration', async () => {
    const {
      GraphQLAPIEndpointOutput: gen1APIEndpoint,
      GraphQLAPIKeyOutput: gen1APIKey,
      DataSourceMappingOutput,
    } = await createGen1Project(gen1ProjFolderName, gen1ProjRoot, 'simple_model.graphql');
    writeTableMap(gen2ProjRoot, DataSourceMappingOutput);
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'migration', 'base-migration'));
    const name = await initCDKProject(gen2ProjRoot, templatePath, { construct: 'Data' });
    const outputs = await cdkDeploy(gen2ProjRoot, '--all');
    const { awsAppsyncApiEndpoint: gen2APIEndpoint, awsAppsyncApiKey: gen2APIKey } = outputs[name];

    const gen1Result = await graphql(
      gen1APIEndpoint,
      gen1APIKey,
      /* GraphQL */ `
        mutation CREATE_TODO {
          createTodo(input: { description: "todo desc" }) {
            id
            description
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
          createTodo(input: { description: "todo desc" }) {
            id
            description
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
              description
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
              description
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
              description
            }
          }
        }
      `,
    );

    expect(listResult.statusCode).toEqual(200);
    expect(listResult.body.data.listTodos.items.length).toEqual(2);
    expect([gen1Todo.id, gen2Todo.id]).toContain(listResult.body.data.listTodos.items[0].id);
    expect([gen1Todo.id, gen2Todo.id]).toContain(listResult.body.data.listTodos.items[1].id);

    // TODO: update table
    // TODO: preform queries
  });
});

import * as path from 'path';
import * as fs from 'fs';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { graphql } from '../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK Multiple GSI Updates', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'multigsi';
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('CDK Multi GSI', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'multi-gsi-update'));
    const name = await initCDKProject(projRoot, templatePath);
    const schemaFilePath = path.join(projRoot, 'bin', 'schema.graphql');

    fs.writeFileSync(
      schemaFilePath,
      /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          field1: String!
          field2: String!
        }
      `,
    );
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

    const createResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_TODO {
          createTodo(input: {}) {
            id
          }
        }
      `,
    );
    expect(createResult.statusCode).toEqual(200);
    const todoId = createResult.body.data.createTodo.id;

    const getTodoQuery = /* GraphQL */ `
      query GET_TODO {
        getTodo(id: "${todoId}") {
          id
        }
      }
    `;

    const getTodoResult = await graphql(apiEndpoint, apiKey, getTodoQuery);
    expect(getTodoResult.statusCode).toEqual(200);

    const retrievedTodo = getTodoResult.body.data.getTodo;
    expect(retrievedTodo).toBeDefined();
    expect(retrievedTodo.id).toEqual(todoId);

    fs.writeFileSync(
      schemaFilePath,
      /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          field1: String! @index
          field2: String! @index
        }
      `,
    );
    await cdkDeploy(projRoot, '--all');

    const getTodoPostUpdateResult = await graphql(apiEndpoint, apiKey, getTodoQuery);
    expect(getTodoPostUpdateResult.statusCode).toEqual(200);

    const retrievedTodoPostUpdate = getTodoPostUpdateResult.body.data.getTodo;
    expect(retrievedTodoPostUpdate).toBeDefined();
    expect(retrievedTodoPostUpdate.id).toEqual(todoId);
  });
});

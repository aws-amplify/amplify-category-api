import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('Data Construct', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'data';
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

  ['2.129.0', 'latest'].forEach((cdkVersion) => {
    test(`Data Construct - aws-cdk-lib@${cdkVersion}`, async () => {
      const templatePath = path.resolve(path.join(__dirname, 'backends', 'data-construct'));
      const name = await initCDKProject(projRoot, templatePath, { cdkVersion, construct: 'Data' });
      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

      const result = await graphql(
        apiEndpoint,
        apiKey,
        /* GraphQL */ `
          mutation CREATE_TODO {
            createTodo(input: { description: "todo desc" }) {
              id
              description
            }
          }
        `,
      );
      expect(result.statusCode).toEqual(200);

      const todo = result.body.data.createTodo;

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
      expect(listResult.statusCode).toEqual(200);
      expect(listResult.body.data.listTodos.items.length).toEqual(1);
      expect(todo.id).toEqual(listResult.body.data.listTodos.items[0].id);
    });
  });
});

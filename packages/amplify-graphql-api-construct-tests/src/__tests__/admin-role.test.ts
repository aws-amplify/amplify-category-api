import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK Auth Modes', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir('adminrole');
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('Can be invoked with Admin Roles defined', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'admin-role'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

    // Shallow validation that api key works (e.g. stack deployed successfully)
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
  });
});

import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { graphql } from '../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK GraphQL Transformer - Merged API', () => {
  let projRoot: string;

  /**
   * Destroy the Cloudformation Stack, and delete the local project directory.
   */
  afterAll(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('works with a merged api', async () => {
    projRoot = await createNewProjectDir('mergedapi');
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'merged-api'));
    const name = await initCDKProject(projRoot, templatePath, '2.100.0'); // Use a newer version of CDK supporting merged apis
    const outputs = await cdkDeploy(projRoot, '--all');
    const { mergedApiEndpoint, mergedApiKey } = outputs[name];

    const result = await graphql(
      mergedApiEndpoint,
      mergedApiKey,
      /* GraphQL */ `
        query CREATE_TODO {
          createTodo(input: { description: "Merged Todo" }) {
            id
            description
          }
        }
      `,
    );
    expect(result.statusCode).toEqual(200);
    expect(result.body.createTodo.id).toBeDefined();
    expect(result.body.createTodo.description).toEqual('Merged Todo');
  });
});

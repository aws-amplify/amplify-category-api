import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('Validate Directive', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'validate';
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

  test('Validate directive - field validation', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'validate'));
    const name = await initCDKProject(projRoot, templatePath, { construct: 'Data' });
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

    // Test invalid input - should fail validation
    const invalidResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CreateInvalidUser {
          createUser(input: { email: "invalid-email", age: 15 }) {
            id
            email
            age
          }
        }
      `,
    );
    expect(invalidResult.statusCode).toEqual(400);
    expect(invalidResult.body.errors[0].message).toContain('Invalid email format');

    // Test valid input - should succeed
    const validResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CreateValidUser {
          createUser(input: { email: "test@example.com", age: 25 }) {
            id
            email
            age
          }
        }
      `,
    );
    expect(validResult.statusCode).toEqual(200);
    expect(validResult.body.data.createUser.email).toEqual('test@example.com');
    expect(validResult.body.data.createUser.age).toEqual(25);
  });
});

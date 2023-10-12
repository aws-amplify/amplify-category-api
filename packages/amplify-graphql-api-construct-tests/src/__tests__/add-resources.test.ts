import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { graphql } from '../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK Resource Utilities', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdkresources';
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

  test('CDK add resources', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'add-resources'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

    const result = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query ECHO_QUERY {
          echo(message: "Hello, Appsync!")
        }
      `,
    );

    expect(result.statusCode).toEqual(200);
    const echoedMessage = result.body.data.echo;
    expect(echoedMessage).toBeDefined();
    expect(echoedMessage).toEqual('Hello, Appsync!');
  });
});

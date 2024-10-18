import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../utils/appsync-graphql/graphql-request';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

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

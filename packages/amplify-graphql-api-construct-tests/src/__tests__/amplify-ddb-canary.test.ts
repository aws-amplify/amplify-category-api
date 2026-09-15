import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { cdkDestroy } from '../commands';
import { setupBackend, testGraphQLOperations } from '../canary-tests-common';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('Canary using Amplify DynamoDB model datasource strategy', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'amplifyddbcanary';
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

  test('Able to deploy simple schema', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'canary'));
    const outputs = await setupBackend(projRoot, templatePath);
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs;
    await testGraphQLOperations(apiEndpoint, apiKey);
  });
});

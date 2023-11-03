import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { updateCDKAppWithTemplate } from '../update-cdk-app-with-template';
import { cdkDestroy, initCDKProject, cdkDeploy } from '../commands';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK GraphQL Transformer', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdkamplifytable';
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

  ['2.80.0'].forEach((cdkVersion) => {
    test(`CDK base case - aws-cdk-lib@${cdkVersion}`, async () => {
      const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table'));
      const name = await initCDKProject(projRoot, templatePath, cdkVersion);
      const outputs = await cdkDeploy(projRoot, '--all');

      const updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'updateIndex'));
      updateCDKAppWithTemplate(projRoot, updateTemplatePath);
      await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];
      expect(apiEndpoint).toBeDefined();
      expect(apiKey).toBeDefined();
    });
  });
});

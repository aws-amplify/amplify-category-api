import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy, updateCDKAppWithTemplate } from '../commands';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK amplify table 4', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdkamplifytable4';
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

  test('should not throw limit exceed error when creating a large number of tables with datastore enabled', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'rate-limit', 'createTableTtl'));
    await initCDKProject(projRoot, templatePath);
    await expect(cdkDeploy(projRoot, '--all')).resolves.not.toThrow();
  });
  test('should not throw limit exceed error when creating a large number of tables with datastore disabled at first and enabled in second deployment', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'rate-limit', 'updateTableTtl', 'disabled'));
    await initCDKProject(projRoot, templatePath);
    await expect(cdkDeploy(projRoot, '--all')).resolves.not.toThrow();
    // deploy with datastore enabled
    let updateTemplatePath;
    updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'rate-limit', 'updateTableTtl', 'enabled'));
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await expect(cdkDeploy(projRoot, '--all')).resolves.not.toThrow();
  });
});

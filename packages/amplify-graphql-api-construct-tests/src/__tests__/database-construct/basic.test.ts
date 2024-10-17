import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy } from '../../commands';
import { DURATION_1_HOUR } from '../../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK Amplify Database', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdkamplifydatabase';
    projRoot = await createNewProjectDir(projFolderName);
    console.log(projRoot);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('create mysql database cluster', async () => {
    const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'database-construct', 'basic-mysql'));
    await initCDKProject(projRoot, templatePath, { construct: 'Database' });
    await cdkDeploy(projRoot, '--all');
    // TODO: add assertions
  });

  test('create postgres database cluster', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'database-construct', 'basic-postgres'));
    await initCDKProject(projRoot, templatePath);
    await cdkDeploy(projRoot, '--all');
    // TODO: add assertions
  });
});
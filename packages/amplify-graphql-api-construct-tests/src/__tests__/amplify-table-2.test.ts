import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy, updateCDKAppWithTemplate } from '../commands';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK amplify table 2', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdkamplifytable2';
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

  // https://github.com/aws-amplify/amplify-category-api/issues/1518
  test('can update a schema with sortKeyField added when destructive update is allowed', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', '2'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Post-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);
    expect(table.Table.KeySchema).toEqual([
      {
        AttributeName: 'id',
        KeyType: 'HASH',
      },
    ]);
    const updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', '2', 'addSortKeyFields'));
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await cdkDeploy(projRoot, '--all');
    const updatedTable = await getDDBTable(tableName, region);
    expect(updatedTable.Table.KeySchema).toEqual([
      {
        AttributeName: 'id',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'title',
        KeyType: 'RANGE',
      },
    ]);
  });
});

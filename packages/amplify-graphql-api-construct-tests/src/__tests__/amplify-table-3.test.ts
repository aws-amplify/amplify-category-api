import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy, updateCDKAppWithTemplate } from '../commands';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK amplify table 3', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdkamplifytable3';
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

  test('cannot replace table when destructive updates are not allowed', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'simple-todo'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Todo-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);
    expect(table.Table.KeySchema[0]).toEqual({
      AttributeName: 'id',
      KeyType: 'HASH',
    });
    // deploy with destructive update disabled
    let updateTemplatePath;
    updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'simple-todo', 'updateKeySchema', 'disabled'));
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await expect(cdkDeploy(projRoot, '--all')).rejects.toThrow();
    const tableAfterFailure = await getDDBTable(tableName, region);
    expect(tableAfterFailure.Table.KeySchema[0]).toEqual({
      AttributeName: 'id',
      KeyType: 'HASH',
    });
    // deploy with destructive update enabled
    updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'simple-todo', 'updateKeySchema', 'enabled'));
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await cdkDeploy(projRoot, '--all');
    const updatedTable = await getDDBTable(tableName, region);
    expect(updatedTable.Table.KeySchema[0]).toEqual({
      AttributeName: 'todoid',
      KeyType: 'HASH',
    });
  });
});

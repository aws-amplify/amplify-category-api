import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable, getDDBTableTags } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy, updateCDKAppWithTemplate } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

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
    const tableTags = await getDDBTableTags(table.Table.TableArn, region);
    expect(tableTags.Tags).toBeDefined();
    expect(tableTags.Tags.length).toBe(3);
    expect(tableTags.Tags).toEqual(
      expect.arrayContaining([
        { Key: 'amplify:deployment-type', Value: 'sandbox-original' },
        { Key: 'amplify:friendly-name', Value: 'amplifyData-original' },
        { Key: 'created-by', Value: 'amplify-original' },
      ]),
    );
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
    const tableAfterFailureTags = await getDDBTableTags(tableAfterFailure.Table.TableArn, region);
    expect(tableAfterFailureTags.Tags).toBeDefined();
    expect(tableAfterFailureTags.Tags.length).toBe(3);
    expect(tableAfterFailureTags.Tags).toEqual(
      expect.arrayContaining([
        { Key: 'amplify:deployment-type', Value: 'sandbox-original' },
        { Key: 'amplify:friendly-name', Value: 'amplifyData-original' },
        { Key: 'created-by', Value: 'amplify-original' },
      ]),
    );

    // deploy with destructive update enabled
    updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'simple-todo', 'updateKeySchema', 'enabled'));
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await cdkDeploy(projRoot, '--all');
    const updatedTable = await getDDBTable(tableName, region);
    expect(updatedTable.Table.KeySchema[0]).toEqual({
      AttributeName: 'todoid',
      KeyType: 'HASH',
    });
    const updatedTableTags = await getDDBTableTags(updatedTable.Table.TableArn, region);
    expect(updatedTableTags.Tags).toBeDefined();
    expect(updatedTableTags.Tags.length).toBe(3);
    expect(updatedTableTags.Tags).toEqual(
      expect.arrayContaining([
        { Key: 'amplify:deployment-type', Value: 'sandbox-updated' },
        { Key: 'amplify:friendly-name', Value: 'amplifyData-updated' },
        { Key: 'created-by', Value: 'amplify-updated' },
      ]),
    );
  });
});

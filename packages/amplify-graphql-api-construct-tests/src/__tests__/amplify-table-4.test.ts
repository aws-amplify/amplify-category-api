import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable, getDDBTableTags } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy, updateCDKAppWithTemplate } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

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
    const name = await initCDKProject(projRoot, templatePath);

    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Todo1-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);
    expect(table).toBeDefined();

    // Verify the tags on the table
    const tableTags = await getDDBTableTags(table.Table.TableArn, region);
    expect(tableTags.Tags).toBeDefined();
    expect(tableTags.Tags.length).toBe(1);
    expect(tableTags.Tags).toEqual(expect.arrayContaining([{ Key: 'created-by', Value: 'amplify-original' }]));

    // deploy with datastore enabled
    const updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'rate-limit', 'updateTableTtl', 'enabled'));
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await expect(cdkDeploy(projRoot, '--all')).resolves.not.toThrow();

    const updatedTable = await getDDBTable(tableName, region);
    expect(updatedTable).toBeDefined();

    // Verify the tags on the table after update
    const updatedTableTags = await getDDBTableTags(updatedTable.Table.TableArn, region);
    expect(updatedTableTags.Tags).toBeDefined();
    expect(updatedTableTags.Tags.length).toBe(0);
  });
});

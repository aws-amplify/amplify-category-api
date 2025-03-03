import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable, getDDBTableTags } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy, updateCDKAppWithTemplate } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK amplify table 1', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdkamplifytable1';
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

  test('can update multiple GSIs along with other non-GSI updates', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'simple-todo'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Todo-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);
    expect(table).toBeDefined();
    expect(table.Table.BillingModeSummary.BillingMode).toBe('PAY_PER_REQUEST');
    expect(table.Table.GlobalSecondaryIndexes[0].IndexName).toBe('byName');
    // Important: When SSE is undefined or set to false,
    // it doesn't mean SSE is disabled, it means that the table is using AWS owned key for SSE.
    expect(table.Table.SSEDescription).toBeUndefined();
    expect(table.Table.StreamSpecification.StreamViewType).toBe('NEW_AND_OLD_IMAGES');

    // Verify the tags on the table
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

    const updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'simple-todo', 'updateIndex'));
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await cdkDeploy(projRoot, '--all');
    const updatedTable = await getDDBTable(tableName, region);
    expect(updatedTable).toBeDefined();
    expect(updatedTable.Table.BillingModeSummary.BillingMode).toBe('PROVISIONED');
    expect(updatedTable.Table.GlobalSecondaryIndexes[0].IndexName).toBe('byName2');
    expect(updatedTable.Table.SSEDescription.Status).toBe('ENABLED');
    expect(updatedTable.Table.StreamSpecification.StreamViewType).toBe('KEYS_ONLY');

    // Verify the tags on the table after update
    const updatedTableTags = await getDDBTableTags(updatedTable.Table.TableArn, region);
    expect(updatedTableTags.Tags).toBeDefined();
    expect(updatedTableTags.Tags.length).toBe(5);
    expect(updatedTableTags.Tags).toEqual(
      expect.arrayContaining([
        { Key: 'amplify:deployment-type', Value: 'pipeline-updated' },
        { Key: 'amplify:deployment-branch', Value: 'main-updated' },
        { Key: 'amplify:appId', Value: '123456-updated' },
        { Key: 'amplify:friendly-name', Value: 'amplifyData-updated' },
        { Key: 'created-by', Value: 'amplify-updated' },
      ]),
    );
  });
});

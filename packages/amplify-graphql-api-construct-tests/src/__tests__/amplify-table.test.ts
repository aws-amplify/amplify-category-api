import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy, updateCDKAppWithTemplate } from '../commands';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK amplify table', () => {
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

  test('can update multiple GSIs along with other non-GSI updates', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Todo-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);
    expect(table).toBeDefined();
    expect(table.Table.BillingModeSummary.BillingMode).toBe('PAY_PER_REQUEST');
    expect(table.Table.GlobalSecondaryIndexes[0].IndexName).toBe('byName');
    expect(table.Table.SSEDescription.Status).toBe('ENABLED');
    expect(table.Table.StreamSpecification.StreamViewType).toBe('NEW_AND_OLD_IMAGES');
    const updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'updateIndex'));
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await cdkDeploy(projRoot, '--all');
    const updatedTable = await getDDBTable(tableName, region);
    expect(updatedTable).toBeDefined();
    expect(updatedTable.Table.BillingModeSummary.BillingMode).toBe('PROVISIONED');
    expect(updatedTable.Table.GlobalSecondaryIndexes[0].IndexName).toBe('byName2');
    expect(updatedTable.Table.SSEDescription).toBeUndefined();
    expect(updatedTable.Table.StreamSpecification.StreamViewType).toBe('KEYS_ONLY');
  });
});

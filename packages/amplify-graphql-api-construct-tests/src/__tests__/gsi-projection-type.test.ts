import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('GSI Projection Type', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'gsiprojectiontype';
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

  test('creates GSI with KEYS_ONLY projection', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'gsi-projection-type', 'keys-only'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Product-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);

    expect(table.Table.GlobalSecondaryIndexes).toBeDefined();
    expect(table.Table.GlobalSecondaryIndexes.length).toBe(1);
    expect(table.Table.GlobalSecondaryIndexes[0].IndexName).toBe('byCategory');
    expect(table.Table.GlobalSecondaryIndexes[0].Projection.ProjectionType).toBe('KEYS_ONLY');
  });

  test('creates GSI with INCLUDE projection', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'gsi-projection-type', 'include'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Product-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);

    expect(table.Table.GlobalSecondaryIndexes).toBeDefined();
    expect(table.Table.GlobalSecondaryIndexes.length).toBe(1);
    expect(table.Table.GlobalSecondaryIndexes[0].IndexName).toBe('byCategory');
    expect(table.Table.GlobalSecondaryIndexes[0].Projection.ProjectionType).toBe('INCLUDE');
    expect(table.Table.GlobalSecondaryIndexes[0].Projection.NonKeyAttributes).toEqual(expect.arrayContaining(['name', 'price']));
  });

  test('creates GSI with ALL projection', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'gsi-projection-type', 'all'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Product-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);

    expect(table.Table.GlobalSecondaryIndexes).toBeDefined();
    expect(table.Table.GlobalSecondaryIndexes.length).toBe(1);
    expect(table.Table.GlobalSecondaryIndexes[0].IndexName).toBe('byCategory');
    expect(table.Table.GlobalSecondaryIndexes[0].Projection.ProjectionType).toBe('ALL');
  });
});

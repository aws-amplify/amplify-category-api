import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('GSI Projection Type', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir('gsiprojectiontype');
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }
    deleteProjectDir(projRoot);
    if (global.gc) global.gc();
  });

  test.each([
    [
      'KEYS_ONLY',
      'keys-only',
      (gsi: any) => {
        expect(gsi.Projection.ProjectionType).toBe('KEYS_ONLY');
      },
    ],
    [
      'INCLUDE',
      'include',
      (gsi: any) => {
        expect(gsi.Projection.ProjectionType).toBe('INCLUDE');
        expect(gsi.Projection.NonKeyAttributes).toEqual(expect.arrayContaining(['name', 'price']));
      },
    ],
    [
      'ALL',
      'all',
      (gsi: any) => {
        expect(gsi.Projection.ProjectionType).toBe('ALL');
      },
    ],
  ])('creates GSI with %s projection', async (_projectionType, templateDir, validator) => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'gsi-projection-type', templateDir));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const table = await getDDBTable(`Product-${apiId}-NONE`, region);
    const gsi = table.Table.GlobalSecondaryIndexes[0];

    expect(table.Table.GlobalSecondaryIndexes).toBeDefined();
    expect(table.Table.GlobalSecondaryIndexes.length).toBe(1);
    expect(gsi.IndexName).toBe('byCategory');
    validator(gsi);
  });
});

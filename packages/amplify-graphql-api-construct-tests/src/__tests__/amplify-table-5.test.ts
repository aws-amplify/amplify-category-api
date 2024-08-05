import { createNewProjectDir, deleteProjectDir, getDDBTable } from 'amplify-category-api-e2e-core';
import * as path from 'path';
import { cdkDeploy, cdkDestroy, initCDKProject, updateCDKAppWithTemplate } from '../commands';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK amplify table 5', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdkamplifytable5';
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

  test('datatype change on indexed field should replace the index', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'simple-todo'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Todo-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);
    expect(table.Table.AttributeDefinitions).toHaveLength(2);
    const nameAttr = table.Table.AttributeDefinitions.find((attr) => attr.AttributeName === 'name');
    expect(nameAttr.AttributeType).toEqual('S');
    expect(table.Table.GlobalSecondaryIndexes).toHaveLength(1);
    expect(table.Table.GlobalSecondaryIndexes[0].IndexName).toEqual('byName');

    // deploy with modified attribute type
    const updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'simple-todo', 'attributeTypeChange'));
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await expect(cdkDeploy(projRoot, '--all')).resolves.not.toThrow();
    const modifiedTable = await getDDBTable(tableName, region);
    expect(modifiedTable.Table.AttributeDefinitions).toHaveLength(3);
    const modifiedNameAttr = modifiedTable.Table.AttributeDefinitions.find((attr) => attr.AttributeName === 'name');
    expect(modifiedNameAttr.AttributeType).toEqual('N');
    expect(modifiedTable.Table.GlobalSecondaryIndexes).toHaveLength(2);
    expect(modifiedTable.Table.GlobalSecondaryIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          IndexName: 'byNameDescription',
        }),
        expect.objectContaining({
          IndexName: 'byName',
        }),
      ]),
    );
  });
});

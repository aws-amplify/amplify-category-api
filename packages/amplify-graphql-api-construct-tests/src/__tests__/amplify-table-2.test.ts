import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, getDDBTable } from 'amplify-category-api-e2e-core';
import { cdkDestroy, initCDKProject, cdkDeploy, updateCDKAppWithTemplate } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

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
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'blog-hasmany-posts'));
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
    const updateTemplatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'blog-hasmany-posts', 'addSortKeyFields'));
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

  test('table will be replaced upon GSI updates when both sandbox mode and destructive update are enabled', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'amplify-table', 'simple-todo'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiId: apiId, awsAppsyncRegion: region } = outputs[name];
    const tableName = `Todo-${apiId}-NONE`;
    const table = await getDDBTable(tableName, region);
    const creationDateTime = table.Table.CreationDateTime;

    let updateTemplatePath;
    let updatedTable;
    // Enable both sandbox and destructive update along with GSI change
    updateTemplatePath = path.resolve(
      path.join(__dirname, 'backends', 'amplify-table', 'simple-todo', 'sandboxAndDestructiveUpdate', 'bothEnabled'),
    );
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await cdkDeploy(projRoot, '--all');
    updatedTable = await getDDBTable(tableName, region);
    const newCreationDateTime = updatedTable.Table.CreationDateTime;
    // Table should be replaced
    expect(newCreationDateTime).not.toEqual(creationDateTime);

    // Only disable sandbox along with GSI change
    updateTemplatePath = path.resolve(
      path.join(__dirname, 'backends', 'amplify-table', 'simple-todo', 'sandboxAndDestructiveUpdate', 'disableSandbox'),
    );
    updateCDKAppWithTemplate(projRoot, updateTemplatePath);
    await cdkDeploy(projRoot, '--all');
    updatedTable = await getDDBTable(tableName, region);
    // Table should not be replaced
    expect(updatedTable.Table.CreationDateTime).toEqual(newCreationDateTime);
  });
});

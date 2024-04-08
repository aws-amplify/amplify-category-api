import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import generator from 'generate-password';
import { getResourceNamesForStrategyName } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { cdkDestroy } from '../commands';
import { testGraphQLAPI } from './sql-models-common';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('Canary using MySQL lambda model datasource strategy', () => {
  let projRoot: string;
  const projFolderName = 'mysqlcanary';
  const [username, password, identifier] = generator.generateMultiple(3);
  const region = process.env.CLI_REGION;
  const dbname = 'default_db';
  const engine = 'mysql';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(
    ['CREATE TABLE todos (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))'],
    {
      identifier,
      engine,
      dbname,
      username,
      password,
      region,
    },
  );

  const strategyName = `${engine}DBStrategy`;
  const resourceNames = getResourceNamesForStrategyName(strategyName);

  beforeAll(async () => {
    await databaseController.setupDatabase();
  });

  afterAll(async () => {
    await databaseController.cleanupDatabase();
  });

  beforeEach(async () => {
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (err) {
      console.log(`Error invoking 'cdk destroy': ${err}`);
    }

    deleteProjectDir(projRoot);
  });

  test('Able to deploy simple schema', async () => {
    await testGraphQLAPI(constructTestOptions('connectionUri'));
  });

  const constructTestOptions = (connectionConfigName: string) => ({
    projRoot,
    region,
    connectionConfigName,
    dbController: databaseController,
    resourceNames,
  });
});

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import generator from 'generate-password';
import { getResourceNamesForStrategyName } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { cdkDestroy } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPI } from './sql-models-common';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with SQL datasources', () => {
  let projRoot: string;
  const projFolderName = 'sqlmodels1';

  const [username, identifier] = generator.generateMultiple(2);

  const region = process.env.CLI_REGION ?? 'us-west-2';

  const dbname = 'default_db';
  const engine = 'mysql';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(
    [
      'CREATE TABLE todos (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))',
      'CREATE TABLE students (studentId INT NOT NULL, classId VARCHAR(256) NOT NULL, firstName VARCHAR(256), lastName VARCHAR(256), PRIMARY KEY (studentId, classId))',
    ],
    {
      identifier,
      engine,
      dbname,
      username,
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

  test('creates a GraphQL API from SQL-based models with Secrets Manager Credential Store default encryption key', async () => {
    await testGraphQLAPI(constructTestOptions('secretsManager'));
  });

  test('creates a GraphQL API from SQL-based models with Secrets Manager Credential Store custom encryption key', async () => {
    await testGraphQLAPI(constructTestOptions('secretsManagerCustomKey'));
  });

  test('creates a GraphQL API from SQL-based models with Secrets Manager Credential Store default encryption key', async () => {
    await testGraphQLAPI(constructTestOptions('secretsManagerManagedSecret'));
  });

  const constructTestOptions = (connectionConfigName: string) => ({
    projRoot,
    region,
    connectionConfigName,
    dbController: databaseController,
    resourceNames,
  });
});

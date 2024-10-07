import generator from 'generate-password';
import { getResourceNamesForStrategyName, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { TestOptions } from '../utils/sql-test-config-helper';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPI } from '../sql-tests-common/sql-models';
import { sqlCreateStatements } from '../sql-tests-common/tests-sources/sql-models/provider';

jest.setTimeout(DURATION_1_HOUR);

describe('Canary using Postgres lambda model datasource strategy', () => {
  const projFolderName = 'pgcanary';

  // sufficient password length that meets the requirements for RDS cluster/instance
  const [username, password, identifier] = generator.generateMultiple(3, { length: 11 });
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const engine = 'postgres';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(sqlCreateStatements(), {
    identifier,
    engine,
    username,
    password,
    region,
  });

  const strategyName = `${engine}DBStrategy`;
  const resourceNames = getResourceNamesForStrategyName(strategyName);

  beforeAll(async () => {
    console.time('sql-pg-canary test setup');
    await databaseController.setupDatabase();
    console.timeEnd('sql-pg-canary test setup');
  });

  afterAll(async () => {
    await databaseController.cleanupDatabase();
  });

  const constructTestOptions = (connectionConfigName: string): TestOptions => ({
    projFolderName,
    region,
    connectionConfigName,
    dbController: databaseController,
    resourceNames,
  });

  testGraphQLAPI(constructTestOptions('connectionUri'), 'Able to deploy simple schema', ImportedRDSType.POSTGRESQL);
});

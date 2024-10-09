import generator from 'generate-password';
import { getResourceNamesForStrategyName, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { TestOptions } from '../utils/sql-test-config-helper';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPIAutoIncrement } from '../sql-tests-common/sql-auto-increment';
import { sqlCreateStatements } from '../sql-tests-common/tests-sources/sql-auto-increment/provider';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with Postgres SQL datasources', () => {
  const projFolderName = 'pgautoincrement';

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
    await databaseController.setupDatabase();
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

  testGraphQLAPIAutoIncrement(
    constructTestOptions('connectionUri'),
    'creates a GraphQL API from SQL-based models using Connection String SSM parameter',
    ImportedRDSType.POSTGRESQL,
  );
});

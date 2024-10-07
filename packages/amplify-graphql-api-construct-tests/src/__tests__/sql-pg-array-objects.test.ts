import generator from 'generate-password';
import { getResourceNamesForStrategyName, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { TestOptions } from '../utils/sql-test-config-helper';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPIArrayAndObjects } from '../sql-tests-common/sql-array-objects';
import { sqlCreateStatements } from '../sql-tests-common/tests-sources/sql-array-objects/provider';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with Postgres SQL datasources', () => {
  const projFolderName = 'pgarrayobjects';

  // sufficient password length that meets the requirements for RDS cluster/instance
  const [username, password, identifier] = generator.generateMultiple(3, { length: 11 });
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const engine = 'postgres';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(sqlCreateStatements(ImportedRDSType.POSTGRESQL), {
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

  testGraphQLAPIArrayAndObjects(
    constructTestOptions('connectionUri'),
    'RDS Postgres Model Directive using Connection String SSM parameter',
    ImportedRDSType.POSTGRESQL,
  );
});

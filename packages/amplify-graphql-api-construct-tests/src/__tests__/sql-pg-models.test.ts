import generator from 'generate-password';
import { getResourceNamesForStrategyName, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { TestOptions } from '../utils/sql-test-config-helper';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPI } from '../sql-tests-common/sql-models';
import { sqlCreateStatements } from '../sql-tests-common/tests-sources/sql-models/provider';
import { tryScheduleCredentialRefresh } from 'amplify-category-api-e2e-core';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with Postgres SQL datasources', () => {
  const projFolderName = 'pgmodels';

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
    tryScheduleCredentialRefresh();
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

  testGraphQLAPI(
    constructTestOptions('ssm'),
    'creates a GraphQL API from SQL-based models with SSM Credential Store',
    ImportedRDSType.POSTGRESQL,
  );

  testGraphQLAPI(
    constructTestOptions('connectionUri'),
    'creates a GraphQL API from SQL-based models using Connection String SSM parameter',
    ImportedRDSType.POSTGRESQL,
  );
});

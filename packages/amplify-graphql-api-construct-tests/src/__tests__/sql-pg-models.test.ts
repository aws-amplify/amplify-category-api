import generator from 'generate-password';
import { getResourceNamesForStrategyName, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { getRDSTableNamePrefix } from 'amplify-category-api-e2e-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPI } from '../sql-tests-common/sql-models';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with Postgres SQL datasources', () => {
  const projFolderName = 'pgmodels';

  // sufficient password length that meets the requirements for RDS cluster/instance
  const [username, password, identifier] = generator.generateMultiple(3, { length: 11 });
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const engine = 'postgres';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(
    [
      `CREATE TABLE "${getRDSTableNamePrefix()}todos" ("id" VARCHAR(40) PRIMARY KEY, "description" VARCHAR(256))`,
      `CREATE TABLE "${getRDSTableNamePrefix()}students" ("studentId" integer NOT NULL, "classId" text NOT NULL, "firstName" text, "lastName" text, PRIMARY KEY ("studentId", "classId"))`,
    ],
    {
      identifier,
      engine,
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
    console.log('Cleaning up database');
    await databaseController.cleanupDatabase();
  });

  const constructTestOptions = (connectionConfigName: string) => ({
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

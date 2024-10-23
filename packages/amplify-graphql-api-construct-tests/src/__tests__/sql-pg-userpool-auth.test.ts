import generator from 'generate-password';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { TestOptions } from '../utils/sql-test-config-helper';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPIWithUserPoolAccess } from '../sql-tests-common/sql-userpool-auth';
import { sqlCreateStatements } from '../sql-tests-common/tests-sources/sql-dynamic-model-auth/sql-userpool-auth/provider';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with Postgres SQL datasources - UserPool Auth', () => {
  const projFolderName = 'pguserpoolaccess';

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
  });

  testGraphQLAPIWithUserPoolAccess(constructTestOptions('ssm'), 'UserPool Auth Access', ImportedRDSType.POSTGRESQL);
});

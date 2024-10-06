import generator from 'generate-password';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceStrategySqlDbType } from '@aws-amplify/graphql-api-construct';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPIWithOIDCAccess } from '../sql-tests-common/sql-oidc-auth';
import { sqlCreateStatements } from '../sql-tests-common/tests-sources/sql-oidc-auth/provider';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with Postgres SQL datasources - OIDC Auth', () => {
  const projFolderName = 'sqlmodelsoidcaccess';

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

  const constructTestOptions = (connectionConfigName: string) => ({
    projFolderName,
    region,
    connectionConfigName,
    dbController: databaseController,
  });

  testGraphQLAPIWithOIDCAccess(constructTestOptions('ssm'), 'OIDC Auth Access', ImportedRDSType.POSTGRESQL);
});

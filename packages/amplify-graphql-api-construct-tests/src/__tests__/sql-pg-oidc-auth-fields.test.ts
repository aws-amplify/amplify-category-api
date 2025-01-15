import generator from 'generate-password';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { TestOptions } from '../utils/sql-test-config-helper';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPIWithOIDCFields } from '../sql-tests-common/sql-oidc-auth-fields';
import { sqlCreateStatements } from '../sql-tests-common/tests-sources/sql-dynamic-model-auth/sql-oidc-auth-fields/provider';
import { getTestProjectSourceStrategy } from '../utils/test-project-source-strategy';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with Postgres SQL datasources - OIDC Auth', () => {
  const projFolderName = 'pgoidcfields';
  const projSourceStrategy = getTestProjectSourceStrategy(projFolderName);

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
    if (projSourceStrategy.type === 'reuse-existing') {
      return;
    }
    await databaseController.setupDatabase();
  });

  afterAll(async () => {
    if (projSourceStrategy.retain) {
      console.log('Skipping database cleanup because project source strategy is "retain".');
      return;
    }
    await databaseController.cleanupDatabase();
  });

  const constructTestOptions = (connectionConfigName: string): TestOptions => ({
    projFolderName,
    region,
    connectionConfigName,
    dbController: databaseController,
    projSourceStrategy,
  });

  testGraphQLAPIWithOIDCFields(constructTestOptions('ssm'), 'OIDC Auth Access - Fields', ImportedRDSType.POSTGRESQL);
});

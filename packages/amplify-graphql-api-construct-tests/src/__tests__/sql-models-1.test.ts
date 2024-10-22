import generator from 'generate-password';
import { getResourceNamesForStrategyName, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPI } from '../sql-tests-common/sql-models';
import { sqlCreateStatements } from '../sql-tests-common/tests-sources/sql-models/provider';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with SQL datasources', () => {
  const projFolderName = 'sqlmodels1';

  const [username, identifier] = generator.generateMultiple(2);

  const region = process.env.CLI_REGION ?? 'us-west-2';

  const dbname = 'default_db';
  const engine = 'mysql';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(sqlCreateStatements(ImportedRDSType.MYSQL), {
    identifier,
    engine,
    dbname,
    username,
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

  const constructTestOptions = (connectionConfigName: string) => ({
    projFolderName,
    region,
    connectionConfigName,
    dbController: databaseController,
    resourceNames,
  });

  testGraphQLAPI(
    constructTestOptions('secretsManager'),
    'creates a GraphQL API from SQL-based models with Secrets Manager Credential Store default encryption key',
    ImportedRDSType.MYSQL,
  );

  testGraphQLAPI(
    constructTestOptions('secretsManagerCustomKey'),
    'creates a GraphQL API from SQL-based models with Secrets Manager Credential Store custom encryption key',
    ImportedRDSType.MYSQL,
  );

  testGraphQLAPI(
    constructTestOptions('secretsManagerManagedSecret'),
    'creates a GraphQL API from SQL-based models with Secrets Manager Managed Credential Store default encryption key',
    ImportedRDSType.MYSQL,
  );
});

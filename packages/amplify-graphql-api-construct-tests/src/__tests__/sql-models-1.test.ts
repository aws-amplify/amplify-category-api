import generator from 'generate-password';
import { getResourceNamesForStrategyName, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPI } from '../sql-tests-common/sql-models';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with SQL datasources', () => {
  const projFolderName = 'sqlmodels1';

  const [username, identifier] = generator.generateMultiple(2);

  const region = process.env.CLI_REGION ?? 'us-west-2';

  const dbname = 'default_db';
  const engine = 'mysql';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(
    [
      'CREATE TABLE e2e_test_todos (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))',
      'CREATE TABLE e2e_test_students (studentId INT NOT NULL, classId VARCHAR(256) NOT NULL, firstName VARCHAR(256), lastName VARCHAR(256), PRIMARY KEY (studentId, classId))',
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
    constructTestOptions('secretsManager'),
    'creates a GraphQL API from SQL-based models with Secrets Manager Credential Store custom encryption key',
    ImportedRDSType.MYSQL,
  );

  testGraphQLAPI(
    constructTestOptions('secretsManagerManagedSecret'),
    'creates a GraphQL API from SQL-based models with Secrets Manager Managed Credential Store default encryption key',
    ImportedRDSType.MYSQL,
  );
});

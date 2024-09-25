import generator from 'generate-password';
import { getResourceNamesForStrategyName, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { getRDSTableNamePrefix } from 'amplify-category-api-e2e-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPI } from '../sql-tests-common/sql-models';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with SQL datasources', () => {
  const projFolderName = 'sqlmodels2';

  const [username, password, identifier] = generator.generateMultiple(3);

  const region = process.env.CLI_REGION ?? 'us-west-2';

  const dbname = 'default_db';
  const engine = 'mysql';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(
    [
      `CREATE TABLE ${getRDSTableNamePrefix()}todos (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))`,
      `CREATE TABLE ${getRDSTableNamePrefix()}students (studentId INT NOT NULL, classId VARCHAR(256) NOT NULL, firstName VARCHAR(256), lastName VARCHAR(256), PRIMARY KEY (studentId, classId))`,
    ],
    {
      identifier,
      engine,
      dbname,
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
    ImportedRDSType.MYSQL,
  );

  testGraphQLAPI(
    constructTestOptions('connectionUri'),
    'creates a GraphQL API from SQL-based models using Connection Uri SSM path',
    ImportedRDSType.MYSQL,
  );

  testGraphQLAPI(
    constructTestOptions('connectionUriMultiple'),
    'creates a GraphQL API from SQL-based models using multiple Connection Uri SSM paths',
    ImportedRDSType.MYSQL,
  );
});

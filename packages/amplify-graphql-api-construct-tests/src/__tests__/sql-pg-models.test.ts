import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import generator from 'generate-password';
import { getResourceNamesForStrategyName } from '@aws-amplify/graphql-transformer-core';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { cdkDestroy } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { testGraphQLAPI } from './sql-models-common';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with Postgres SQL datasources', () => {
  let projRoot: string;
  const projFolderName = 'pgmodels';

  // sufficient password length that meets the requirements for RDS cluster/instance
  const [username, password, identifier] = generator.generateMultiple(3, { length: 11 });
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const engine = 'postgres';

  const databaseController: SqlDatatabaseController = new SqlDatatabaseController(
    [
      'CREATE TABLE "todos" ("id" VARCHAR(40) PRIMARY KEY, "description" VARCHAR(256))',
      'CREATE TABLE "students" ("studentId" integer NOT NULL, "classId" text NOT NULL, "firstName" text, "lastName" text, PRIMARY KEY ("studentId", "classId"))',
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
    await databaseController.cleanupDatabase();
  });

  beforeEach(async () => {
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (err) {
      console.log(`Error invoking 'cdk destroy': ${err}`);
    }

    deleteProjectDir(projRoot);
  });

  test('creates a GraphQL API from SQL-based models with SSM Credential Store', async () => {
    await testGraphQLAPI(constructTestOptions('ssm'));
  });

  // test('creates a GraphQL API from SQL-based models using Connection String SSM parameter', async () => {
  //   await testGraphQLAPI(constructTestOptions('connectionUri'));
  // });

  const constructTestOptions = (connectionConfigName: string) => ({
    projRoot,
    region,
    connectionConfigName,
    dbController: databaseController,
    resourceNames,
  });
});

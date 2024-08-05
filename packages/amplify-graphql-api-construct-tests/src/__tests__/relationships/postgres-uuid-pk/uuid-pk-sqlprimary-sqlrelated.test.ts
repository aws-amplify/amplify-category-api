/* eslint-disable import/namespace */
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as fs from 'fs-extra';
import * as generator from 'generate-password';
import * as path from 'path';
import { cdkDeploy, cdkDestroy, initCDKProject } from '../../../commands';
import { SqlDatabaseDetails, SqlDatatabaseController } from '../../../sql-datatabase-controller';
import { dbDetailsToModelDataSourceStrategy, TestDefinition, writeStackConfig, writeTestDefinitions } from '../../../utils';
import { DURATION_1_HOUR, ONE_MINUTE } from '../../../utils/duration-constants';
import {
  testPrimaryWithNoRelatedWorks,
  testPrimaryWithRelatedWorks,
  testRelatedManyWithNoPrimaryWorks,
  testRelatedManyWithPrimaryWorks,
  testRelatedOneWithNoPrimaryWorks,
  testRelatedOneWithPrimaryWorks,
} from './test-implementations';

jest.setTimeout(DURATION_1_HOUR);

describe('PostgreSQL tables with UUID primary keys', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const baseProjFolderName = path.basename(__filename, '.test.ts');

  const [dbUsername, dbIdentifier] = generator.generateMultiple(2);
  const dbname = 'postgres';
  let dbDetails: SqlDatabaseDetails;

  // Note that the SQL database is created with slightly non-standard naming conventions, to avoid us having to use `refersTo` in the schema
  // snippets. That allows us to reuse the same snippets across both DDB and SQL data sources, simplifying the test fixture data.
  const databaseController = new SqlDatatabaseController(
    [
      'drop table if exists "RelatedMany";',
      'drop table if exists "RelatedOne";',
      'drop table if exists "Primary";',

      'create table "Primary" ( id uuid primary key not null default gen_random_uuid());',

      'create table "RelatedMany"( id uuid primary key not null default gen_random_uuid(), "primaryId" varchar(64));',
      'create index "RelatedMany_primaryId" on "RelatedMany"("primaryId");',

      'create table "RelatedOne"( id uuid primary key not null default gen_random_uuid(), "primaryId" varchar(64));',
      'create index "RelatedOne_primaryId" on "RelatedOne"("primaryId");',
    ],
    {
      identifier: dbIdentifier,
      engine: 'postgres',
      dbname,
      username: dbUsername,
      region,
    },
  );

  beforeAll(async () => {
    dbDetails = await databaseController.setupDatabase();
  });

  afterAll(async () => {
    await databaseController.cleanupDatabase();
  });

  describe('SQL Primary, SQL Related', () => {
    const projFolderName = `${baseProjFolderName}-sql-primary-sql-related`;
    let apiEndpoint: string;
    let apiKey: string;
    let projRoot: string;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
      const name = await initCDKProject(projRoot, templatePath);

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-primary.graphql'));
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-related.graphql'));
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'sql-primary-sql-related': {
          schema: [primarySchema, relatedSchema].join('\n'),
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlprimarysqlrelated', 'POSTGRES', 'secretsManagerManagedSecret'),
        },
      };

      writeStackConfig(projRoot, { prefix: 'UuidPkSqlSql', useSandbox: true });
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: 2 * ONE_MINUTE });
      apiEndpoint = outputs[name].awsAppsyncApiEndpoint;
      apiKey = outputs[name].awsAppsyncApiKey;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    describe('Primary as source', () => {
      test('Primary model with related models can be created, updated, queried, and deleted', async () => {
        await testPrimaryWithRelatedWorks(apiEndpoint, apiKey);
      });

      test('Primary model with no related models can be created, updated, queried, and deleted', async () => {
        await testPrimaryWithNoRelatedWorks(apiEndpoint, apiKey);
      });
    });

    describe('RelatedOne as source', () => {
      test('RelatedOne model with a primary model can be created, updated, queried, and deleted', async () => {
        await testRelatedOneWithPrimaryWorks(apiEndpoint, apiKey);
      });

      test('RelatedOne models with no primary model can be created, updated, queried, and deleted', async () => {
        await testRelatedOneWithNoPrimaryWorks(apiEndpoint, apiKey);
      });
    });

    describe('RelatedMany as source', () => {
      test('RelatedMany models with a primary model can be created, updated, queried, and deleted', async () => {
        await testRelatedManyWithPrimaryWorks(apiEndpoint, apiKey);
      });

      test('RelatedMany models with no primary model can be created, updated, queried, and deleted', async () => {
        await testRelatedManyWithNoPrimaryWorks(apiEndpoint, apiKey);
      });
    });
  });
});

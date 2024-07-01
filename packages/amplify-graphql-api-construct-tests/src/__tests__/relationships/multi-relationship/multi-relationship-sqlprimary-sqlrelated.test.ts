import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as generator from 'generate-password';
import { initCDKProject, cdkDestroy } from '../../../commands';
import { dbDetailsToModelDataSourceStrategy, TestDefinition, writeStackConfig, writeTestDefinitions } from '../../../utils';
import { SqlDatabaseDetails, SqlDatatabaseController } from '../../../sql-datatabase-controller';
import { DURATION_1_HOUR } from '../../../utils/duration-constants';
import {
  deployStack,
  testPrimaryRetrievesCorrectRelationships,
  testRelatedManyRetrievesCorrectRelationships,
  testRelatedOneRetrievesCorrectRelationships,
} from './test-implementations';

jest.setTimeout(DURATION_1_HOUR);

describe('Models with multiple relationships', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const baseProjFolderName = path.basename(__filename, '.test.ts');

  const [dbUsername, dbIdentifier] = generator.generateMultiple(2);
  const dbname = 'default_db';
  let dbDetails: SqlDatabaseDetails;

  // Note that the SQL database is created with slightly non-standard naming conventions, to avoid us having to use `refersTo` in the schema
  // snippets. That allows us to reuse the same snippets across both DDB and SQL data sources, simplifying the test fixture data.
  const databaseController = new SqlDatatabaseController(
    [
      'drop table if exists `RelatedMany`;',
      'drop table if exists `RelatedOne`;',
      'drop table if exists `Primary`;',

      'create table `Primary` ( id varchar(64) primary key not null, content varchar(64));',

      'create table `RelatedMany`( id varchar(64) primary key not null, content varchar(64), `primaryId1` varchar(64), `primaryId2` varchar(64));',
      'create index `RelatedMany_primaryId1` on `RelatedMany`(`primaryId1`);',
      'create index `RelatedMany_primaryId2` on `RelatedMany`(`primaryId2`);',

      'create table `RelatedOne`( id varchar(64) primary key not null, content varchar(64), `primaryId1` varchar(64), `primaryId2` varchar(64));',
      'create index `RelatedOne_primaryId1` on `RelatedOne`(`primaryId1`);',
      'create index `RelatedOne_primaryId2` on `RelatedOne`(`primaryId2`);',
    ],
    {
      identifier: dbIdentifier,
      engine: 'mysql',
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

  describe('SQL primary, SQL related', () => {
    const projFolderName = `${baseProjFolderName}-sql-primary-sql-related`;
    let apiEndpoint: string;
    let apiKey: string;
    let currentId: number;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
      const name = await initCDKProject(projRoot, templatePath);

      const primarySchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'multi-relationship', 'schema-primary.graphql'),
      );
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'multi-relationship', 'schema-related.graphql'),
      );
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'sql-only': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlonly', 'MYSQL', 'secretsManagerManagedSecret'),
        },
      };

      writeStackConfig(projRoot, { prefix: 'MultiRelSqlSql', useSandbox: true });
      writeTestDefinitions(testDefinitions, projRoot);

      const testConfig = await deployStack({
        projRoot,
        name,
      });

      apiEndpoint = testConfig.apiEndpoint;
      apiKey = testConfig.apiKey;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    test('primary retrieves correct relationships', async () => {
      await testPrimaryRetrievesCorrectRelationships(currentId, apiEndpoint, apiKey);
    });

    test('relatedMany retrieves correct relationships', async () => {
      await testRelatedManyRetrievesCorrectRelationships(currentId, apiEndpoint, apiKey);
    });

    test('relatedOne retrieves correct relationships', async () => {
      await testRelatedOneRetrievesCorrectRelationships(currentId, apiEndpoint, apiKey);
    });
  });
});

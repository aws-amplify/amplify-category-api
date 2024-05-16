import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as generator from 'generate-password';
import { initCDKProject, cdkDestroy } from '../../../commands';
import { dbDetailsToModelDataSourceStrategy, TestDefinition, writeStackConfig, writeTestDefinitions } from '../../../utils';
import { SqlDatabaseDetails, SqlDatatabaseController } from '../../../sql-datatabase-controller';
import { DURATION_1_HOUR } from '../../../utils/duration-constants';
import {
  deployStackAndCreateUsers,
  testCreatePrimaryIsForbidden,
  testCreatePrimaryRedactsRelated,
  testCreateRelatedManyIsForbidden,
  testCreateRelatedManyRedactsPrimary,
  testCreateRelatedOneIsForbidden,
  testCreateRelatedOneRedactsPrimary,
  testGetPrimaryDoesNotRedactRelated,
  testGetPrimaryRedactsRelated,
  testGetRelatedManyDoesNotRedactPrimary,
  testGetRelatedManyRedactsPrimary,
  testGetRelatedOneDoesNotRedactPrimary,
  testGetRelatedOneRedactsPrimary,
  testListPrimariesDoesNotRedactRelated,
  testListPrimariesRedactsRelated,
  testListRelatedManiesDoesNotRedactPrimary,
  testListRelatedManiesRedactsPrimary,
  testListRelatedOnesDoesNotRedactPrimary,
  testListRelatedOnesRedactsPrimary,
  testUpdatePrimaryRedactsRelated,
  testUpdateRelatedManyRedactsPrimary,
  testUpdateRelatedOneRedactsPrimary,
} from './test-implementations';

jest.setTimeout(DURATION_1_HOUR);

// Each of these tests asserts that restricted fields in associated types are properly redacted. To assert this, we create the relationship
// records in an order so that the type we're asserting on comes LAST. By "prepopulating" the associated records before creating the source
// record, we ensure that the selection set is fully populated with relationship data, and can therefore assert that restricted fields on
// the associated records are redacted.
//
// For these tests, "Group1" owns Primary, "Group2" owns Related, and "Group3" is an Admin who owns both
describe('Relationships protected with static group auth', () => {
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

      'create table `RelatedMany`( id varchar(64) primary key not null, content varchar(64), `primaryId` varchar(64));',
      'create index `RelatedMany_primaryId` on `RelatedMany`(`primaryId`);',

      'create table `RelatedOne`( id varchar(64) primary key not null, content varchar(64), `primaryId` varchar(64));',
      'create index `RelatedOne_primaryId` on `RelatedOne`(`primaryId`);',
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
    let adminAccessToken: string;
    let apiEndpoint: string;
    let currentId: number;
    let group1AccessToken: string;
    let group2AccessToken: string;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
      const name = await initCDKProject(projRoot, templatePath);

      const primarySchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-static-group-auth', 'schema-primary.graphql'),
      );
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-static-group-auth', 'schema-related.graphql'),
      );
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'sql-only': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlonly', 'MYSQL', 'secretsManagerManagedSecret'),
        },
      };

      writeStackConfig(projRoot, { prefix: 'StaticGrpSqlSql' });
      writeTestDefinitions(testDefinitions, projRoot);

      const testConfig = await deployStackAndCreateUsers({
        projRoot,
        region,
        name,
      });

      group1AccessToken = testConfig.group1AccessToken;
      group2AccessToken = testConfig.group2AccessToken;
      adminAccessToken = testConfig.adminAccessToken;
      apiEndpoint = testConfig.apiEndpoint;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    describe('Actors belonging to Group1', () => {
      describe('Primary as source model', () => {
        test('createPrimary redacts related models', async () => {
          await testCreatePrimaryRedactsRelated(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });

        test('updatePrimary redacts related models', async () => {
          await testUpdatePrimaryRedactsRelated(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });

        test('getPrimary redacts related models', async () => {
          await testGetPrimaryRedactsRelated(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });

        test('listPrimary redacts related models', async () => {
          await testListPrimariesRedactsRelated(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });
      });

      describe('RelatedOne as source model', () => {
        test('createRelatedOne is forbidden', async () => {
          await testCreateRelatedOneIsForbidden(currentId, apiEndpoint, group1AccessToken);
        });
      });

      describe('RelatedMany as source model', () => {
        test('createRelatedMany is forbidden', async () => {
          await testCreateRelatedManyIsForbidden(currentId, apiEndpoint, group1AccessToken);
        });
      });
    });

    describe('Actors belonging to Group2', () => {
      describe('Primary as source model', () => {
        test('createPrimary is forbidden', async () => {
          await testCreatePrimaryIsForbidden(currentId, apiEndpoint, group2AccessToken);
        });
      });

      describe('RelatedOne as source model', () => {
        test('createRelatedOne redacts primary model', async () => {
          await testCreateRelatedOneRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });

        test('updateRelatedOne redacts primary model', async () => {
          await testUpdateRelatedOneRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });

        test('getRelatedOne redacts primary model', async () => {
          await testGetRelatedOneRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });

        test('listRelatedOne redacts primary model', async () => {
          await testListRelatedOnesRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });
      });

      describe('RelatedMany as source model', () => {
        test('createRelatedMany redacts primary model', async () => {
          await testCreateRelatedManyRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });

        test('updateRelatedMany redacts primary model', async () => {
          await testUpdateRelatedManyRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });

        test('getRelatedMany redacts primary model', async () => {
          await testGetRelatedManyRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });

        test('listRelatedMany redacts primary model', async () => {
          await testListRelatedManiesRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
        });
      });
    });

    describe('Actors belonging to Admin group', () => {
      describe('Primary as source model', () => {
        test('createPrimary redacts related models', async () => {
          await testCreatePrimaryRedactsRelated(currentId, apiEndpoint, adminAccessToken, adminAccessToken);
        });

        test('updatePrimary redacts related models', async () => {
          await testUpdatePrimaryRedactsRelated(currentId, apiEndpoint, adminAccessToken, adminAccessToken);
        });

        test('getPrimary does not redact related models', async () => {
          await testGetPrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
        });

        test('listPrimary does not redact related models', async () => {
          await testListPrimariesDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
        });
      });

      describe('RelatedOne as source model', () => {
        test('createRelatedOne redacts primary model', async () => {
          await testCreateRelatedOneRedactsPrimary(currentId, apiEndpoint, adminAccessToken, adminAccessToken);
        });

        test('updateRelatedOne redacts primary model', async () => {
          await testUpdateRelatedOneRedactsPrimary(currentId, apiEndpoint, adminAccessToken, adminAccessToken);
        });

        test('getRelatedOne does not redact primary model', async () => {
          await testGetRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
        });

        test('listRelatedOne does not redact primary model', async () => {
          await testListRelatedOnesDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
        });
      });

      describe('RelatedMany as source model', () => {
        test('createRelatedMany redacts primary model', async () => {
          await testCreateRelatedManyRedactsPrimary(currentId, apiEndpoint, adminAccessToken, adminAccessToken);
        });

        test('updateRelatedMany redacts primary model', async () => {
          await testUpdateRelatedManyRedactsPrimary(currentId, apiEndpoint, adminAccessToken, adminAccessToken);
        });

        test('getRelatedMany does not redact primary model', async () => {
          await testGetRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
        });

        test('listRelatedMany does not redact primary model', async () => {
          await testListRelatedManiesDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
        });
      });
    });
  });
});

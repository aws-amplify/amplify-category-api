/* eslint-disable import/namespace */
import * as path from 'path';
import * as fs from 'fs-extra';
import * as generator from 'generate-password';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { cdkDeploy, cdkDestroy, initCDKProject } from '../../../commands';
import { SqlDatabaseDetails, SqlDatatabaseController } from '../../../sql-datatabase-controller';
import { TestDefinition, dbDetailsToModelDataSourceStrategy, writeStackConfig, writeTestDefinitions } from '../../../utils';
import { DURATION_1_HOUR, ONE_MINUTE } from '../../../utils/duration-constants';
import {
  testPrimaryContainsAssociated,
  testPrimaryCpkSkOneContainsAssociated,
  testPrimaryCpkSkTwoContainAssociated,
  testPrimaryMultipleHasOneContainsOneHasOne,
  testRelatedManyContainsAssociated,
  testRelatedManyCpkSkOneContainsAssociated,
  testRelatedManypkSkTwoContainsAssociated,
  testRelatedOneContainsAssociated,
  testRelatedOneCpkSkOneContainsAssociated,
  testRelatedOneCpkSkTwoContainsAssociated,
} from './test-implementations';

jest.setTimeout(DURATION_1_HOUR);

describe('References relationships', () => {
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

      // Single primary key
      'create table `Primary` ( id varchar(64) primary key not null );',

      'create table `RelatedMany`( id varchar(64) primary key not null, `primaryId` varchar(64));',
      'create index `RelatedMany_primaryId` on `RelatedMany`(`primaryId`);',

      'create table `RelatedOne`( id varchar(64) primary key not null, `primaryId` varchar(64));',
      'create index `RelatedOne_primaryId` on `RelatedOne`(`primaryId`);',

      // Two primary keys
      'create table `PrimaryCPKSKOne` ( id varchar(64) not null, skOne varchar(64) not null, PRIMARY KEY (`id`, `skOne`) );',

      'create table `RelatedManyCPKSKOne`( id varchar(64) primary key not null, `primaryId` varchar(64), `primarySkOne` varchar(64) );',
      'create index `RelatedManyCPKSKOne_primaryId_skOne` on `RelatedManyCPKSKOne`(`primaryId`, `primarySkOne`);',

      'create table `RelatedOneCPKSKOne`( id varchar(64) primary key not null, `primaryId` varchar(64), `primarySkOne` varchar(64) );',
      'create index `RelatedOnCPKSKOne_primaryId_skOne` on `RelatedOneCPKSKOne`(`primaryId`, `primarySkOne`);',

      // Three primary keys
      'create table `PrimaryCPKSKTwo` ( id varchar(64) not null, skOne varchar(64) not null, skTwo varchar(64) not null, PRIMARY KEY (`id`, `skOne`, `skTwo`) );',

      'create table `RelatedManyCPKSKTwo`( id varchar(64) primary key not null, `primaryId` varchar(64), `primarySkOne` varchar(64), `primarySkTwo` varchar(64) );',
      'create index `RelatedManyCPKSKTwo` on `RelatedManyCPKSKTwo`(`primaryId`, `primarySkOne`, `primarySkTwo`);',

      'create table `RelatedOneCPKSKTwo`( id varchar(64) primary key not null, `primaryId` varchar(64), `primarySkOne` varchar(64), `primarySkTwo` varchar(64) );',
      'create index `RelatedOnCPKSKTwo_primaryId_skOne` on `RelatedOneCPKSKTwo`(`primaryId`, `primarySkOne`, `primarySkTwo`);',
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

  describe('DDB Primary, SQL Related', () => {
    const projFolderName = `${baseProjFolderName}-ddb-primary-sql-related`;
    let apiEndpoint: string;
    let apiKey: string;
    let projRoot: string;
    let currentId: number;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
      const name = await initCDKProject(projRoot, templatePath);

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-primary.graphql'));
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-related.graphql'));
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const primarySchemaOneSkPath = path.resolve(path.join(__dirname, 'graphql', 'schema-primary-cpk-1sk.graphql'));
      const primarySchemaOneSk = fs.readFileSync(primarySchemaOneSkPath).toString();

      const relatedSchemaOneSkPath = path.resolve(path.join(__dirname, 'graphql', 'schema-related-cpk-1sk.graphql'));
      const relatedSchemaOneSk = fs.readFileSync(relatedSchemaOneSkPath).toString();

      const primarySchemaTwoSkPath = path.resolve(path.join(__dirname, 'graphql', 'schema-primary-cpk-2sk.graphql'));
      const primarySchemaTwoSk = fs.readFileSync(primarySchemaTwoSkPath).toString();

      const relatedSchemaTwoSkPath = path.resolve(path.join(__dirname, 'graphql', 'schema-related-cpk-2sk.graphql'));
      const relatedSchemaTwoSk = fs.readFileSync(relatedSchemaTwoSkPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'ddb-primary': {
          schema: [primarySchema, primarySchemaOneSk, primarySchemaTwoSk].join('\n'),
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
        'sql-related': {
          schema: [relatedSchema, relatedSchemaOneSk, relatedSchemaTwoSk].join('\n'),
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlrelated', 'MYSQL', 'secretsManagerManagedSecret'),
        },
      };

      writeStackConfig(projRoot, { prefix: 'RefSqlDdb', useSandbox: true });
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
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
      test('Associated models included in query and mutation response with single primary key', async () => {
        await testPrimaryContainsAssociated(currentId, apiEndpoint, apiKey);
      });

      test('Associated models included in query and mutation response with one sort key', async () => {
        await testPrimaryCpkSkOneContainsAssociated(currentId, apiEndpoint, apiKey);
      });

      test('Associated models included in query and mutation response with two sort keys', async () => {
        await testPrimaryCpkSkTwoContainAssociated(currentId, apiEndpoint, apiKey);
      });

      test('Multiple RelatedOne associated records returns one RelatedOne record', async () => {
        await testPrimaryMultipleHasOneContainsOneHasOne(currentId, apiEndpoint, apiKey);
      });
    });

    describe('RelatedOne as source', () => {
      test('Associated models included in query and mutation response with single primary key', async () => {
        await testRelatedOneContainsAssociated(currentId, apiEndpoint, apiKey);
      });

      test('Associated models included in query and mutation response with one sort key', async () => {
        await testRelatedOneCpkSkOneContainsAssociated(currentId, apiEndpoint, apiKey);
      });

      test('Associated models included in query and mutation response with two sort keys', async () => {
        await testRelatedOneCpkSkTwoContainsAssociated(currentId, apiEndpoint, apiKey);
      });
    });

    describe('RelatedMany as source', () => {
      test('Associated models included in query and mutation response with single primary key', async () => {
        await testRelatedManyContainsAssociated(currentId, apiEndpoint, apiKey);
      });

      test('Associated models included in query and mutation response with one sort key', async () => {
        await testRelatedManyCpkSkOneContainsAssociated(currentId, apiEndpoint, apiKey);
      });

      test('Associated models included in query and mutation response with two sort keys', async () => {
        await testRelatedManypkSkTwoContainsAssociated(currentId, apiEndpoint, apiKey);
      });
    });
  });
});

import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as generator from 'generate-password';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../../../commands';
import {
  createCognitoUser,
  dbDetailsToModelDataSourceStrategy,
  signInCognitoUser,
  TestDefinition,
  writeStackPrefix,
  writeTestDefinitions,
} from '../../../utils';
import { SqlDatabaseDetails, SqlDatatabaseController } from '../../../sql-datatabase-controller';
import { testProtectsHasMany, testProtectsHasOne } from './test-implementations';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

/**
 * We have separate tests to ensure we properly escape/bind incoming SQL variables. These E2Es ensure that binding carries over to
 * reference fields in a relationship, since the IDs & primary keys have special handling in the resolvers.
 */
describe('Reference IDs pointing to SQL data sources are bound to prevent SQL injection', () => {
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

      'create table `Primary` ( id varchar(64) primary key not null, secret varchar(64), owner varchar(64));',
      'create index `Primary_owner` on `Primary`(owner);',

      'create table `RelatedMany`( id varchar(64) primary key not null, secret varchar(64), owner varchar(64), `primaryId` varchar(64));',
      'create index `RelatedMany_owner` on `RelatedMany`(owner);',
      'create index `RelatedMany_primaryId` on `RelatedMany`(`primaryId`);',

      'create table `RelatedOne`( id varchar(64) primary key not null, secret varchar(64), owner varchar(64), `primaryId` varchar(64));',
      'create index `RelatedOne_owner` on `RelatedOne`(owner);',
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
    let accessToken: string;
    let accessToken2: string;
    let apiEndpoint: string;
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
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-owner-auth', 'schema-primary.graphql'),
      );
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-owner-auth', 'schema-related.graphql'),
      );
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'sql-only': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlonly', 'MYSQL', 'secretsManagerManagedSecret'),
        },
      };

      writeStackPrefix('BindIdsSqlSql', projRoot);
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint, UserPoolClientId: userPoolClientId, UserPoolId: userPoolId } = outputs[name];

      apiEndpoint = awsAppsyncApiEndpoint;

      const { username: username1, password: password1 } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: newAccessToken1 } = await signInCognitoUser({
        username: username1,
        password: password1,
        region,
        userPoolClientId,
      });

      accessToken = newAccessToken1;

      const { username: username2, password: password2 } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: newAccessToken2 } = await signInCognitoUser({
        username: username2,
        password: password2,
        region,
        userPoolClientId,
      });

      accessToken2 = newAccessToken2;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    it('should protect hasOne/belongsTo relationships', async () => {
      await testProtectsHasOne(currentId, apiEndpoint, accessToken, accessToken2);
    });

    it('should protect hasMany/belongsTo relationships', async () => {
      await testProtectsHasMany(currentId, apiEndpoint, accessToken, accessToken2);
    });
  });

  describe('SQL primary, DDB related', () => {
    const projFolderName = `${baseProjFolderName}-sql-primary-ddb-related`;
    let accessToken: string;
    let accessToken2: string;
    let apiEndpoint: string;
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
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-owner-auth', 'schema-primary.graphql'),
      );
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-owner-auth', 'schema-related.graphql'),
      );
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'sql-primary': {
          schema: primarySchema,
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlprimary', 'MYSQL', 'secretsManagerManagedSecret'),
        },
        'ddb-related': {
          schema: relatedSchema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackPrefix('BindIdsSqlDdb', projRoot);
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint, UserPoolClientId: userPoolClientId, UserPoolId: userPoolId } = outputs[name];

      apiEndpoint = awsAppsyncApiEndpoint;

      const { username: username1, password: password1 } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: newAccessToken1 } = await signInCognitoUser({
        username: username1,
        password: password1,
        region,
        userPoolClientId,
      });

      accessToken = newAccessToken1;

      const { username: username2, password: password2 } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: newAccessToken2 } = await signInCognitoUser({
        username: username2,
        password: password2,
        region,
        userPoolClientId,
      });

      accessToken2 = newAccessToken2;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    it('should protect hasOne/belongsTo relationships', async () => {
      await testProtectsHasOne(currentId, apiEndpoint, accessToken, accessToken2);
    });

    it('should protect hasMany/belongsTo relationships', async () => {
      await testProtectsHasMany(currentId, apiEndpoint, accessToken, accessToken2);
    });
  });
});

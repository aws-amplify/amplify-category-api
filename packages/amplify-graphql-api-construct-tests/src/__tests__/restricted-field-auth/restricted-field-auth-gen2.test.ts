import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as generator from 'generate-password';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../../commands';
import {
  createCognitoUser,
  dbDetailsToModelDataSourceStrategy,
  signInCognitoUser,
  TestDefinition,
  writeStackPrefix,
  writeTestDefinitions,
} from '../../utils';
import { SqlDatabaseDetails, SqlDatatabaseController } from '../../sql-datatabase-controller';
import {
  testCreatePrimaryRedacted,
  testUpdatePrimaryRedacted,
  testCreateRelatedOneRedacted,
  testUpdateRelatedOneRedacted,
  testCreateRelatedManyRedacted,
  testUpdateRelatedManyRedacted,
} from './gen2-test-implementations';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

// Each of these tests asserts that restricted fields in associated types are properly redacted. To assert this, we create the relationship
// records in an order so that the type we're asserting on comes LAST. By "prepopulating" the associated records before creating the source
// record, we ensure that the selection set is fully populated with relationship data, and can therefore assert that restricted fields on
// the associated records are redacted.
describe('Associated type fields with more restrictive auth rules than the model are redacted using gen2 references-based connections', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const baseProjFolderName = 'restricted-field-auth';

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
      'create index primary_owner on `Primary`(owner);',

      'create table RelatedMany( id varchar(64) primary key not null, secret varchar(64), owner varchar(64), `primaryId` varchar(64));',
      'create index RelatedMany_owner on `RelatedMany`(owner);',
      'create index RelatedMany_primaryId on `RelatedMany`(`primaryId`);',

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
    let apiEndpoint: string;
    let currentId: number;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'restricted-field-auth'));
      const name = await initCDKProject(projRoot, templatePath);

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'gen2', 'schema-primary.graphql'));
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'gen2', 'schema-related.graphql'));
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'sql-only': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlonly', 'MYSQL', 'secretsManagerManagedSecret'),
        },
      };

      writeStackPrefix('RFSqlSql', projRoot);
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint, UserPoolClientId: userPoolClientId, UserPoolId: userPoolId } = outputs[name];

      apiEndpoint = awsAppsyncApiEndpoint;

      const { username, password } = await createCognitoUser({
        region,
        userPoolId,
      });
      const testCredsFilePath = path.join(projRoot, 'cognito-user.json');
      const testCreds = JSON.stringify({ username, password });
      fs.writeFileSync(testCredsFilePath, testCreds);
      console.log(`Wrote test creds to ${testCredsFilePath}`);

      const { accessToken: newAccessToken } = await signInCognitoUser({
        username,
        password,
        region,
        userPoolClientId,
      });

      accessToken = newAccessToken;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    test('createPrimary is redacted', async () => {
      await testCreatePrimaryRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updatePrimary is redacted', async () => {
      await testUpdatePrimaryRedacted(currentId, apiEndpoint, accessToken);
    });

    test('createRelatedOne is redacted', async () => {
      await testCreateRelatedOneRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updateRelatedOne is redacted', async () => {
      await testUpdateRelatedOneRedacted(currentId, apiEndpoint, accessToken);
    });

    test('createRelatedMany is redacted', async () => {
      await testCreateRelatedManyRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updateRelatedMany is redacted', async () => {
      await testUpdateRelatedManyRedacted(currentId, apiEndpoint, accessToken);
    });
  });

  describe('DDB primary, DDB related', () => {
    const projFolderName = `${baseProjFolderName}-ddb-primary-ddb-related`;
    let accessToken: string;
    let apiEndpoint: string;
    let currentId: number;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'restricted-field-auth'));
      const name = await initCDKProject(projRoot, templatePath);

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'gen2', 'schema-primary.graphql'));
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'gen2', 'schema-related.graphql'));
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'ddb-prim-ddb-related': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackPrefix('RFDdbDdb', projRoot);
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint, UserPoolClientId: userPoolClientId, UserPoolId: userPoolId } = outputs[name];

      apiEndpoint = awsAppsyncApiEndpoint;

      const { username, password } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: newAccessToken } = await signInCognitoUser({
        username,
        password,
        region,
        userPoolClientId,
      });

      accessToken = newAccessToken;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    test('createPrimary is redacted', async () => {
      await testCreatePrimaryRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updatePrimary is redacted', async () => {
      await testUpdatePrimaryRedacted(currentId, apiEndpoint, accessToken);
    });

    test('createRelatedOne is redacted', async () => {
      await testCreateRelatedOneRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updateRelatedOne is redacted', async () => {
      await testUpdateRelatedOneRedacted(currentId, apiEndpoint, accessToken);
    });

    test('createRelatedMany is redacted', async () => {
      await testCreateRelatedManyRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updateRelatedMany is redacted', async () => {
      await testUpdateRelatedManyRedacted(currentId, apiEndpoint, accessToken);
    });
  });

  describe('SQL primary, DDB related', () => {
    const projFolderName = `${baseProjFolderName}-sql-primary-ddb-related`;
    let accessToken: string;
    let apiEndpoint: string;
    let currentId: number;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'restricted-field-auth'));
      const name = await initCDKProject(projRoot, templatePath);

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'gen2', 'schema-primary.graphql'));
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'gen2', 'schema-related.graphql'));
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

      writeStackPrefix('RFSqlDdb', projRoot);
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint, UserPoolClientId: userPoolClientId, UserPoolId: userPoolId } = outputs[name];

      apiEndpoint = awsAppsyncApiEndpoint;

      const { username, password } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: newAccessToken } = await signInCognitoUser({
        username,
        password,
        region,
        userPoolClientId,
      });

      accessToken = newAccessToken;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    test('createPrimary is redacted', async () => {
      await testCreatePrimaryRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updatePrimary is redacted', async () => {
      await testUpdatePrimaryRedacted(currentId, apiEndpoint, accessToken);
    });

    test('createRelatedOne is redacted', async () => {
      await testCreateRelatedOneRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updateRelatedOne is redacted', async () => {
      await testUpdateRelatedOneRedacted(currentId, apiEndpoint, accessToken);
    });

    test('createRelatedMany is redacted', async () => {
      await testCreateRelatedManyRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updateRelatedMany is redacted', async () => {
      await testUpdateRelatedManyRedacted(currentId, apiEndpoint, accessToken);
    });
  });

  describe('DDB primary, SQL related', () => {
    const projFolderName = `${baseProjFolderName}-ddb-primary-sql-related`;
    let accessToken: string;
    let apiEndpoint: string;
    let currentId: number;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'restricted-field-auth'));
      const name = await initCDKProject(projRoot, templatePath);

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'gen2', 'schema-primary.graphql'));

      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'gen2', 'schema-related.graphql'));
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'ddb-primary': {
          schema: primarySchema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
        'sql-related': {
          schema: relatedSchema,
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlrelated', 'MYSQL', 'secretsManagerManagedSecret'),
        },
      };

      writeStackPrefix('RFDdbSql', projRoot);
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint, UserPoolClientId: userPoolClientId, UserPoolId: userPoolId } = outputs[name];

      apiEndpoint = awsAppsyncApiEndpoint;

      const { username, password } = await createCognitoUser({
        region,
        userPoolId,
      });

      const { accessToken: newAccessToken } = await signInCognitoUser({
        username,
        password,
        region,
        userPoolClientId,
      });

      accessToken = newAccessToken;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    test('createPrimary is redacted', async () => {
      await testCreatePrimaryRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updatePrimary is redacted', async () => {
      await testUpdatePrimaryRedacted(currentId, apiEndpoint, accessToken);
    });

    test('createRelatedOne is redacted', async () => {
      await testCreateRelatedOneRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updateRelatedOne is redacted', async () => {
      await testUpdateRelatedOneRedacted(currentId, apiEndpoint, accessToken);
    });

    test('createRelatedMany is redacted', async () => {
      await testCreateRelatedManyRedacted(currentId, apiEndpoint, accessToken);
    });

    test('updateRelatedMany is redacted', async () => {
      await testUpdateRelatedManyRedacted(currentId, apiEndpoint, accessToken);
    });
  });
});

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
import {
  testCreatePrimaryRedactedForDifferentOwners,
  testCreatePrimaryVisibleForSameOwner,
  testCreateRelatedManyRedactedForDifferentOwners,
  testCreateRelatedManyVisibleForSameOwner,
  testCreateRelatedOneRedactedForDifferentOwners,
  testCreateRelatedOneVisibleForSameOwner,
  testGetPrimaryRedactedForDifferentOwners,
  testGetPrimaryVisibleForSameOwner,
  testGetRelatedManyRedactedForDifferentOwners,
  testGetRelatedManyVisibleForSameOwner,
  testGetRelatedOneRedactedForDifferentOwners,
  testGetRelatedOneVisibleForSameOwner,
  testUpdatePrimaryRedactedForDifferentOwners,
  testUpdatePrimaryVisibleForSameOwner,
  testUpdateRelatedManyRedactedForDifferentOwners,
  testUpdateRelatedManyVisibleForSameOwner,
  testUpdateRelatedOneRedactedForDifferentOwners,
  testUpdateRelatedOneVisibleForSameOwner,
} from './test-implementations';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

// Each of these tests asserts that restricted fields in associated types are properly redacted. To assert this, we create the relationship
// records in an order so that the type we're asserting on comes LAST. By "prepopulating" the associated records before creating the source
// record, we ensure that the selection set is fully populated with relationship data, and can therefore assert that restricted fields on
// the associated records are redacted.
describe('Associated fields protected by owner auth control visibility appropriately', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const baseProjFolderName = 'assoc-field';

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

  describe('DDB primary, DDB related', () => {
    const projFolderName = `${baseProjFolderName}-ddb-primary-ddb-related`;
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

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-primary.graphql'));
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-related.graphql'));
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'ddb-prim-ddb-related': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackPrefix('AFDdbDdb', projRoot);
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

    describe('Primary as source model', () => {
      test('createPrimary shows relations if created by same owner', async () => {
        await testCreatePrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createPrimary redacts relations if created by different owner', async () => {
        await testCreatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updatePrimary shows relations if created by same owner', async () => {
        await testUpdatePrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updatePrimary redacts relations if created by different owner', async () => {
        await testUpdatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getPrimary shows relations if created by same owner', async () => {
        await testGetPrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getPrimary redacts relations if created by same owner', async () => {
        await testGetPrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedOne as source model', () => {
      test('createRelatedOne shows relations if created by same owner', async () => {
        await testCreateRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedOne redacts relations if created by same owner', async () => {
        await testCreateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedOne shows relations if created by same owner', async () => {
        await testUpdateRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedOne redacts relations if created by different owner', async () => {
        await testUpdateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedOne shows relations if created by same owner', async () => {
        await testGetRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedOne redacts relations if created by same owner', async () => {
        await testGetRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedMany as source model', () => {
      test('createRelatedMany shows relations if created by same owner', async () => {
        await testCreateRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedMany redacts relations if created by different owner', async () => {
        await testCreateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedMany shows relations if created by same owner', async () => {
        await testUpdateRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedMany redacts relations if created by different owner', async () => {
        await testUpdateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedMany shows relations if created by same owner', async () => {
        await testGetRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedMany redacts relations if created by same owner', async () => {
        await testGetRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });
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

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-primary.graphql'));
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-related.graphql'));
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'sql-only': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlonly', 'MYSQL', 'secretsManagerManagedSecret'),
        },
      };

      writeStackPrefix('AFSqlSql', projRoot);
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

    describe('Primary as source model', () => {
      test('createPrimary shows relations if created by same owner', async () => {
        await testCreatePrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createPrimary redacts relations if created by different owner', async () => {
        await testCreatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updatePrimary shows relations if created by same owner', async () => {
        await testUpdatePrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updatePrimary redacts relations if created by different owner', async () => {
        await testUpdatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getPrimary shows relations if created by same owner', async () => {
        await testGetPrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getPrimary redacts relations if created by same owner', async () => {
        await testGetPrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedOne as source model', () => {
      test('createRelatedOne shows relations if created by same owner', async () => {
        await testCreateRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedOne redacts relations if created by same owner', async () => {
        await testCreateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedOne shows relations if created by same owner', async () => {
        await testUpdateRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedOne redacts relations if created by different owner', async () => {
        await testUpdateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedOne shows relations if created by same owner', async () => {
        await testGetRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedOne redacts relations if created by same owner', async () => {
        await testGetRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedMany as source model', () => {
      test('createRelatedMany shows relations if created by same owner', async () => {
        await testCreateRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedMany redacts relations if created by different owner', async () => {
        await testCreateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedMany shows relations if created by same owner', async () => {
        await testUpdateRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedMany redacts relations if created by different owner', async () => {
        await testUpdateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedMany shows relations if created by same owner', async () => {
        await testGetRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedMany redacts relations if created by same owner', async () => {
        await testGetRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
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

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-primary.graphql'));
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-related.graphql'));
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

      writeStackPrefix('AFSqlDdb', projRoot);
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

    describe('Primary as source model', () => {
      test('createPrimary shows relations if created by same owner', async () => {
        await testCreatePrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createPrimary redacts relations if created by different owner', async () => {
        await testCreatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updatePrimary shows relations if created by same owner', async () => {
        await testUpdatePrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updatePrimary redacts relations if created by different owner', async () => {
        await testUpdatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getPrimary shows relations if created by same owner', async () => {
        await testGetPrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getPrimary redacts relations if created by same owner', async () => {
        await testGetPrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedOne as source model', () => {
      test('createRelatedOne shows relations if created by same owner', async () => {
        await testCreateRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedOne redacts relations if created by same owner', async () => {
        await testCreateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedOne shows relations if created by same owner', async () => {
        await testUpdateRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedOne redacts relations if created by different owner', async () => {
        await testUpdateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedOne shows relations if created by same owner', async () => {
        await testGetRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedOne redacts relations if created by same owner', async () => {
        await testGetRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedMany as source model', () => {
      test('createRelatedMany shows relations if created by same owner', async () => {
        await testCreateRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedMany redacts relations if created by different owner', async () => {
        await testCreateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedMany shows relations if created by same owner', async () => {
        await testUpdateRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedMany redacts relations if created by different owner', async () => {
        await testUpdateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedMany shows relations if created by same owner', async () => {
        await testGetRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedMany redacts relations if created by same owner', async () => {
        await testGetRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });
  });

  describe('DDB primary, SQL related', () => {
    const projFolderName = `${baseProjFolderName}-ddb-primary-sql-related`;
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

      const primarySchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-primary.graphql'));

      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-related.graphql'));
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

      writeStackPrefix('AFDdbSql', projRoot);
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

    describe('Primary as source model', () => {
      test('createPrimary shows relations if created by same owner', async () => {
        await testCreatePrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createPrimary redacts relations if created by different owner', async () => {
        await testCreatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updatePrimary shows relations if created by same owner', async () => {
        await testUpdatePrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updatePrimary redacts relations if created by different owner', async () => {
        await testUpdatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getPrimary shows relations if created by same owner', async () => {
        await testGetPrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getPrimary redacts relations if created by same owner', async () => {
        await testGetPrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedOne as source model', () => {
      test('createRelatedOne shows relations if created by same owner', async () => {
        await testCreateRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedOne redacts relations if created by same owner', async () => {
        await testCreateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedOne shows relations if created by same owner', async () => {
        await testUpdateRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedOne redacts relations if created by different owner', async () => {
        await testUpdateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedOne shows relations if created by same owner', async () => {
        await testGetRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedOne redacts relations if created by same owner', async () => {
        await testGetRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedMany as source model', () => {
      test('createRelatedMany shows relations if created by same owner', async () => {
        await testCreateRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedMany redacts relations if created by different owner', async () => {
        await testCreateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedMany shows relations if created by same owner', async () => {
        await testUpdateRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedMany redacts relations if created by different owner', async () => {
        await testUpdateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedMany shows relations if created by same owner', async () => {
        await testGetRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedMany redacts relations if created by same owner', async () => {
        await testGetRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });
  });
});

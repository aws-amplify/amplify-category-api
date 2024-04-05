import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as generator from 'generate-password';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import {
  createCognitoUser,
  ConsolidatedDBDetails,
  dbDetailsToModelDataSourceStrategy,
  doAppSyncGraphqlMutation,
  signInCognitoUser,
  TestDefinition,
  writeTestDefinitions,
} from '../utils';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import {
  createPrimary,
  createRelatedMany,
  createRelatedOne,
  updatePrimary,
  updateRelatedMany,
  updateRelatedOne,
} from './graphql-schemas/restricted-field-auth/sql-only/graphql/mutations';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('Associated type fields with more restrictive auth rules than the model are redacted in a homogeneous SQL environment', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const projFolderName = 'restricted-field-auth';

  const [dbUsername, dbIdentifier] = generator.generateMultiple(2);
  const dbname = 'default_db';
  let dbDetails: ConsolidatedDBDetails;
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
    await databaseController.setupDatabase();
  });

  afterAll(async () => {
    await databaseController.cleanupDatabase();
  });

  describe('SQL primary, SQL related', () => {
    let accessToken: string;
    let apiEndpoint: string;
    let currentId: number;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    // Each of these tests asserts that restricted fields in associated types are properly redacted. To assert this, we create the
    // relationship records in an order so that the type we're asserting on comes LAST. By "prepopulating" the associated records before
    // creating the source record, we ensure that the selection set is fully populated with relationship data, and can therefore assert that
    // restricted fields on the associated records are redacted.
    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, 'backends', 'restricted-field-auth'));
      const name = await initCDKProject(projRoot, templatePath);

      const schemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'restricted-field-auth', 'sql-only', 'schema.sql.graphql'));
      const schema = fs.readFileSync(schemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'sql-only': {
          schema,
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlonly', 'MYSQL', 'secretsManagerManagedSecret'),
        },
      };

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
      const primaryId = `p${currentId}`;
      const relatedOneId = `ro${currentId}`;
      const relatedManyId = `rm${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          primaryId,
          secret: 'relatedOne secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryId,
          secret: 'relatedMany secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createPrimary,
        variables: {
          id: primaryId,
          secret: 'primary secret',
        },
      });

      const primary = result.body.data.createPrimary;
      expect(primary).toBeDefined();
      expect(primary.id).toBeDefined();
      expect(primary.secret).toBeNull();
      expect(primary.relatedOne).toBeDefined();
      expect(primary.relatedOne.secret).toBeNull();
      expect(primary.relatedMany).toBeDefined();
      expect(primary.relatedMany.items.length).toEqual(1);
      expect(primary.relatedMany.items[0].secret).toBeNull();
    });

    test('updatePrimary is redacted', async () => {
      const primaryId = `p${currentId}`;
      const relatedOneId = `ro${currentId}`;
      const relatedManyId = `rm${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          primaryId,
          secret: 'relatedOne secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryId,
          secret: 'relatedMany secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createPrimary,
        variables: {
          id: primaryId,
          secret: 'primary secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: updatePrimary,
        variables: {
          id: primaryId,
          secret: 'primary secret updated',
        },
      });

      const primary = result.body.data.updatePrimary;
      expect(primary).toBeDefined();
      expect(primary.secret).toBeNull();
      expect(primary.id).toBeDefined();
      expect(primary.relatedOne).toBeDefined();
      expect(primary.relatedOne.secret).toBeNull();
      expect(primary.relatedMany).toBeDefined();
      expect(primary.relatedMany.items.length).toEqual(1);
      expect(primary.relatedMany.items[0].secret).toBeNull();
    });

    test('createRelatedOne is redacted', async () => {
      const primaryId = `p${currentId}`;
      const relatedOneId = `ro${currentId}`;
      const relatedManyId = `rm${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createPrimary,
        variables: {
          id: primaryId,
          secret: 'primary secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryId,
          secret: 'relatedMany secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          primaryId,
          secret: 'relatedOne secret',
        },
      });

      const relatedOne = result.body.data?.createRelatedOne;
      expect(relatedOne).toBeDefined();
      expect(relatedOne.secret).toBeNull();
      expect(relatedOne.id).toBeDefined();
      expect(relatedOne.primary).toBeDefined();
      expect(relatedOne.primary.secret).toBeNull();
      expect(relatedOne.primary.relatedMany).toBeDefined();
      expect(relatedOne.primary.relatedMany.items.length).toEqual(1);
      expect(relatedOne.primary.relatedMany.items[0].secret).toBeNull();
    });

    test('updateRelatedOne is redacted', async () => {
      const primaryId = `p${currentId}`;
      const relatedOneId = `ro${currentId}`;
      const relatedManyId = `rm${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createPrimary,
        variables: {
          id: primaryId,
          secret: 'primary secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryId,
          secret: 'relatedMany secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          primaryId,
          secret: 'relatedOne secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: updateRelatedOne,
        variables: {
          id: relatedOneId,
          primaryId,
          secret: 'relatedOne updated secret',
        },
      });

      const relatedOne = result.body.data?.updateRelatedOne;
      expect(relatedOne).toBeDefined();
      expect(relatedOne.secret).toBeNull();
      expect(relatedOne.id).toBeDefined();
      expect(relatedOne.primary).toBeDefined();
      expect(relatedOne.primary.secret).toBeNull();
      expect(relatedOne.primary.relatedMany).toBeDefined();
      expect(relatedOne.primary.relatedMany.items.length).toEqual(1);
      expect(relatedOne.primary.relatedMany.items[0].secret).toBeNull();
    });

    test('createRelatedMany is redacted', async () => {
      const primaryId = `p${currentId}`;
      const relatedOneId = `ro${currentId}`;
      const relatedManyId = `rm${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createPrimary,
        variables: {
          id: primaryId,
          secret: 'primary secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          primaryId,
          secret: 'relatedOne secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryId,
          secret: 'relatedMany secret',
        },
      });

      const relatedMany = result.body.data?.createRelatedMany;
      expect(relatedMany).toBeDefined();
      expect(relatedMany.secret).toBeNull();
      expect(relatedMany.id).toBeDefined();
      expect(relatedMany.primary).toBeDefined();
      expect(relatedMany.primary.secret).toBeNull();
      expect(relatedMany.primary.relatedOne).toBeDefined();
      expect(relatedMany.primary.relatedOne.secret).toBeNull();
    });

    test('updateRelatedMany is redacted', async () => {
      const primaryId = `p${currentId}`;
      const relatedOneId = `ro${currentId}`;
      const relatedManyId = `rm${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createPrimary,
        variables: {
          id: primaryId,
          secret: 'primary secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          primaryId,
          secret: 'relatedOne secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryId,
          secret: 'relatedMany secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: updateRelatedMany,
        variables: {
          id: relatedManyId,
          primaryId,
          secret: 'relatedMany secret',
        },
      });

      const relatedMany = result.body.data?.updateRelatedMany;
      expect(relatedMany).toBeDefined();
      expect(relatedMany.secret).toBeNull();
      expect(relatedMany.id).toBeDefined();
      expect(relatedMany.primary).toBeDefined();
      expect(relatedMany.primary.secret).toBeNull();
      expect(relatedMany.primary.relatedOne).toBeDefined();
      expect(relatedMany.primary.relatedOne.secret).toBeNull();
    });
  });
});

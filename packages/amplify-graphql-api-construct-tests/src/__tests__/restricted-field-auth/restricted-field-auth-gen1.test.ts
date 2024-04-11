import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../../commands';
import {
  createCognitoUser,
  doAppSyncGraphqlMutation,
  signInCognitoUser,
  TestDefinition,
  writeStackPrefix,
  writeTestDefinitions,
} from '../../utils';
import {
  createLeftRightJoin,
  createManyLeft,
  createManyRight,
  createPrimary,
  createRelatedMany,
  createRelatedOne,
  updateLeftRightJoin,
  updateManyLeft,
  updateManyRight,
  updatePrimary,
  updateRelatedMany,
  updateRelatedOne,
} from './graphql-schemas/gen1-ddb-only/graphql/mutations';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('Associated type fields with more restrictive auth rules than the model are redacted using gen1 fields-based connections', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const projFolderName = 'restricted-field-auth';

  describe('DDB primary, DDB related', () => {
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
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'restricted-field-auth'));
      const name = await initCDKProject(projRoot, templatePath);

      const schemaPath = path.resolve(path.join(__dirname, 'graphql-schemas', 'gen1-ddb-only', 'schema.graphql'));
      const schema = fs.readFileSync(schemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'ddb-only': {
          schema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackPrefix('RFGen1', projRoot);
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
          relatedOnePrimaryId: primaryId,
          secret: 'relatedOne secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryRelatedManyId: primaryId,
          secret: 'relatedMany secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createPrimary,
        variables: {
          id: primaryId,
          primaryRelatedOneId: relatedOneId,
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
          relatedOnePrimaryId: primaryId,
          secret: 'relatedOne secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryRelatedManyId: primaryId,
          secret: 'relatedMany secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createPrimary,
        variables: {
          id: primaryId,
          primaryRelatedOneId: relatedOneId,
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
          primaryRelatedOneId: relatedOneId,
          secret: 'primary secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryRelatedManyId: primaryId,
          secret: 'relatedMany secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          relatedOnePrimaryId: primaryId,
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
          primaryRelatedOneId: relatedOneId,
          secret: 'primary secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryRelatedManyId: primaryId,
          secret: 'relatedMany secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          relatedOnePrimaryId: primaryId,
          secret: 'relatedOne secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: updateRelatedOne,
        variables: {
          id: relatedOneId,
          relatedOnePrimaryId: primaryId,
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
          primaryRelatedOneId: relatedOneId,
          secret: 'primary secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          relatedOnePrimaryId: primaryId,
          secret: 'relatedOne secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryRelatedManyId: primaryId,
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
          primaryRelatedOneId: relatedOneId,
          secret: 'primary secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedOne,
        variables: {
          id: relatedOneId,
          relatedOnePrimaryId: primaryId,
          secret: 'relatedOne secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createRelatedMany,
        variables: {
          id: relatedManyId,
          primaryRelatedManyId: primaryId,
          secret: 'relatedMany secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: updateRelatedMany,
        variables: {
          id: relatedManyId,
          primaryRelatedManyId: primaryId,
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

    test('createManyLeft is redacted', async () => {
      const joinId = `j${currentId}`;
      const manyLeftId = `ml${currentId}`;
      const manyRightId = `mr${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyRight,
        variables: {
          id: manyRightId,
          secret: 'Right secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createLeftRightJoin,
        variables: {
          id: joinId,
          manyLeftId,
          manyRightId,
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyLeft,
        variables: {
          id: manyLeftId,
          secret: 'Left secret',
        },
      });

      const manyLeft = result.body.data.createManyLeft;
      expect(manyLeft).toBeDefined();
      expect(manyLeft.secret).toBeNull();
      expect(manyLeft.id).toBeDefined();
      expect(manyLeft.manyRight.items.length).toEqual(1);
      expect(manyLeft.manyRight.items[0].manyRight.secret).toBeNull();
    });

    test('updateManyLeft is redacted', async () => {
      const joinId = `j${currentId}`;
      const manyLeftId = `ml${currentId}`;
      const manyRightId = `mr${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyRight,
        variables: {
          id: manyRightId,
          secret: 'Right secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createLeftRightJoin,
        variables: {
          id: joinId,
          manyLeftId,
          manyRightId,
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyLeft,
        variables: {
          id: manyLeftId,
          secret: 'Left secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: updateManyLeft,
        variables: {
          id: manyLeftId,
          secret: 'Left secret updated',
        },
      });

      const manyLeft = result.body.data.updateManyLeft;
      expect(manyLeft).toBeDefined();
      expect(manyLeft.secret).toBeNull();
      expect(manyLeft.id).toBeDefined();
      expect(manyLeft.manyRight.items.length).toEqual(1);
      expect(manyLeft.manyRight.items[0].manyRight.secret).toBeNull();
    });

    test('createManyRight is redacted', async () => {
      const joinId = `j${currentId}`;
      const manyLeftId = `ml${currentId}`;
      const manyRightId = `mr${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyLeft,
        variables: {
          id: manyLeftId,
          secret: 'Left secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createLeftRightJoin,
        variables: {
          id: joinId,
          manyLeftId,
          manyRightId,
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyRight,
        variables: {
          id: manyRightId,
          secret: 'Right secret',
        },
      });

      const manyRight = result.body.data.createManyRight;
      expect(manyRight).toBeDefined();
      expect(manyRight.secret).toBeNull();
      expect(manyRight.id).toBeDefined();
      expect(manyRight.manyLeft.items.length).toEqual(1);
      expect(manyRight.manyLeft.items[0].manyLeft.secret).toBeNull();
    });

    test('updateManyRight is redacted', async () => {
      const joinId = `j${currentId}`;
      const manyLeftId = `ml${currentId}`;
      const manyRightId = `mr${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyLeft,
        variables: {
          id: manyLeftId,
          secret: 'Left secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createLeftRightJoin,
        variables: {
          id: joinId,
          manyLeftId,
          manyRightId,
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyRight,
        variables: {
          id: manyRightId,
          secret: 'Right secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: updateManyRight,
        variables: {
          id: manyRightId,
          secret: 'Right secret updated',
        },
      });

      const manyRight = result.body.data.updateManyRight;
      expect(manyRight).toBeDefined();
      expect(manyRight.secret).toBeNull();
      expect(manyRight.id).toBeDefined();
      expect(manyRight.manyLeft.items.length).toEqual(1);
      expect(manyRight.manyLeft.items[0].manyLeft.secret).toBeNull();
    });

    test('createJoinLeftRight is redacted', async () => {
      const joinId = `j${currentId}`;
      const manyLeftId = `ml${currentId}`;
      const manyRightId = `mr${currentId}`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyLeft,
        variables: {
          id: manyLeftId,
          secret: 'Left secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyRight,
        variables: {
          id: manyRightId,
          secret: 'Right secret',
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createLeftRightJoin,
        variables: {
          id: joinId,
          manyLeftId,
          manyRightId,
        },
      });

      const leftRightJoin = result.body.data.createLeftRightJoin;
      expect(leftRightJoin).toBeDefined();
      expect(leftRightJoin.manyLeft.secret).toBeNull();
      expect(leftRightJoin.manyRight.secret).toBeNull();
    });

    test('updateJoinLeftRight is redacted', async () => {
      const joinId = `j${currentId}`;
      const manyLeftId = `ml${currentId}`;
      const manyRightId1 = `mr${currentId}-1`;
      const manyRightId2 = `mr${currentId}-2`;

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyLeft,
        variables: {
          id: manyLeftId,
          secret: 'Left secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyRight,
        variables: {
          id: manyRightId1,
          secret: 'Right 1 secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createManyRight,
        variables: {
          id: manyRightId2,
          secret: 'Right 2 secret',
        },
      });

      await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: createLeftRightJoin,
        variables: {
          id: joinId,
          manyLeftId,
          manyRightId: manyRightId1,
        },
      });

      const result = await doAppSyncGraphqlMutation({
        apiEndpoint,
        auth: { accessToken },
        query: updateLeftRightJoin,
        variables: {
          id: joinId,
          manyLeftId,
          manyRightId: manyRightId2,
        },
      });

      const leftRightJoin = result.body.data.updateLeftRightJoin;
      expect(leftRightJoin).toBeDefined();
      expect(leftRightJoin.manyLeft.secret).toBeNull();
      expect(leftRightJoin.manyRight.secret).toBeNull();
    });
  });
});

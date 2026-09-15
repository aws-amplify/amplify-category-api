import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../../../commands';
import { createCognitoUser, signInCognitoUser, TestDefinition, writeStackConfig, writeTestDefinitions } from '../../../utils';
import { DURATION_1_HOUR } from '../../../utils/duration-constants';
import {
  testCreatePrimaryRedactedForDifferentOwners,
  testCreateRelatedManyRedactedForDifferentOwners,
  testCreateRelatedOneRedactedForDifferentOwners,
  testGetPrimaryRedactedForDifferentOwners,
  testGetPrimaryUnauthorizedForDifferentOwner,
  testGetPrimaryVisibleForSameOwner,
  testGetRelatedManyRedactedForDifferentOwners,
  testGetRelatedManyVisibleForSameOwner,
  testGetRelatedOneRedactedForDifferentOwners,
  testGetRelatedOneVisibleForSameOwner,
  testListPrimariesRedactedForDifferentOwners,
  testListPrimariesRedactsTopLevelItemsForDifferentOwners,
  testListPrimariesVisibleForSameOwner,
  testListRelatedManiesRedactedForDifferentOwners,
  testListRelatedManiesVisibleForSameOwner,
  testListRelatedOnesRedactedForDifferentOwners,
  testListRelatedOnesVisibleForSameOwner,
  testUpdatePrimaryRedactedForDifferentOwners,
  testUpdateRelatedManyRedactedForDifferentOwners,
  testUpdateRelatedOneRedactedForDifferentOwners,
  testCreatePrimaryRedactedForSameOwner,
  testUpdatePrimaryRedactedForSameOwner,
  testCreateRelatedOneRedactedForSameOwner,
  testUpdateRelatedOneRedactedForSameOwner,
  testCreateRelatedManyRedactedForSameOwner,
  testUpdateRelatedManyRedactedForSameOwner,
} from './test-implementations';

jest.setTimeout(DURATION_1_HOUR);

// Each of these tests asserts that restricted fields in associated types are properly redacted. To assert this, we create the relationship
// records in an order so that the type we're asserting on comes LAST. By "prepopulating" the associated records before creating the source
// record, we ensure that the selection set is fully populated with relationship data, and can therefore assert that restricted fields on
// the associated records are redacted.
describe('Associated fields protected by owner auth control visibility appropriately', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const baseProjFolderName = path.basename(__filename, '.test.ts');

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

      const primarySchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-owner-auth', 'schema-primary.graphql'),
      );
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-owner-auth', 'schema-related.graphql'),
      );
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'ddb-prim-ddb-related': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackConfig(projRoot, { prefix: 'AFDdbDdb' });
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
      test('createPrimary redacts relations if created by same owner', async () => {
        await testCreatePrimaryRedactedForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createPrimary redacts relations if created by different owner', async () => {
        await testCreatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updatePrimary redacts relations if created by same owner', async () => {
        await testUpdatePrimaryRedactedForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updatePrimary redacts relations if created by different owner', async () => {
        await testUpdatePrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getPrimary shows relations if created by same owner', async () => {
        await testGetPrimaryVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getPrimary redacts relations if created by different owner', async () => {
        await testGetPrimaryRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('listPrimaries shows relations if created by same owner', async () => {
        await testListPrimariesVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('listPrimaries redacts relations if created by different owner', async () => {
        await testListPrimariesRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      // We will only test get and list redaction of top-level items for the Primary model, since there is no interesting difference between
      // the use cases for GetRelated* or ListRelated*
      test('getPrimary unauthorized top-level item if created by different owner', async () => {
        await testGetPrimaryUnauthorizedForDifferentOwner(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('listPrimaries redacts top-level items if created by different owner', async () => {
        await testListPrimariesRedactsTopLevelItemsForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedOne as source model', () => {
      test('createRelatedOne redacts relations if created by same owner', async () => {
        await testCreateRelatedOneRedactedForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedOne redacts relations if created by different owner', async () => {
        await testCreateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedOne redacts relations if created by same owner', async () => {
        await testUpdateRelatedOneRedactedForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedOne redacts relations if created by different owner', async () => {
        await testUpdateRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedOne shows relations if created by same owner', async () => {
        await testGetRelatedOneVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedOne redacts relations if created by different owner', async () => {
        await testGetRelatedOneRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('listRelatedOnes shows relations if created by same owner', async () => {
        await testListRelatedOnesVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('listRelatedOnes redacts relations if created by different owner', async () => {
        await testListRelatedOnesRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });

    describe('RelatedMany as source model', () => {
      test('createRelatedMany redacts relations if created by same owner', async () => {
        await testCreateRelatedManyRedactedForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('createRelatedMany redacts relations if created by different owner', async () => {
        await testCreateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('updateRelatedMany redacts relations if created by same owner', async () => {
        await testUpdateRelatedManyRedactedForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('updateRelatedMany redacts relations if created by different owner', async () => {
        await testUpdateRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('getRelatedMany shows relations if created by same owner', async () => {
        await testGetRelatedManyVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('getRelatedMany redacts relations if created by different owner', async () => {
        await testGetRelatedManyRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });

      test('listRelatedManies shows relations if created by same owner', async () => {
        await testListRelatedManiesVisibleForSameOwner(currentId, apiEndpoint, accessToken);
      });

      test('listRelatedManies redacts relations if created by different owner', async () => {
        await testListRelatedManiesRedactedForDifferentOwners(currentId, apiEndpoint, accessToken, accessToken2);
      });
    });
  });
});

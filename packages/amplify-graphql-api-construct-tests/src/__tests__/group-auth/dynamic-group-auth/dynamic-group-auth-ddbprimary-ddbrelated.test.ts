import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDestroy } from '../../../commands';
import { TestDefinition, writeStackConfig, writeTestDefinitions } from '../../../utils';
import { DURATION_1_HOUR } from '../../../utils/duration-constants';
import {
  deployStackAndCreateUsers,
  testCreatePrimaryRedactsRelatedForDifferentOwningGroup,
  testCreateRelatedManyRedactsPrimaryForDifferentOwningGroup,
  testCreateRelatedOneRedactsPrimaryForDifferentOwningGroup,
  testGetPrimaryDoesNotRedactRelatedForSameOwningGroup,
  testGetPrimaryRedactsRelatedForDifferentOwningGroup,
  testGetPrimaryUnauthorizedForDifferentOwner,
  testGetRelatedManyDoesNotRedactPrimaryForSameOwningGroup,
  testGetRelatedManyRedactsPrimaryForDifferentOwningGroup,
  testGetRelatedOneDoesNotRedactPrimaryForSameOwningGroup,
  testGetRelatedOneRedactsPrimaryForDifferentOwningGroup,
  testListPrimariesDoesNotRedactRelatedForSameOwningGroup,
  testListPrimariesRedactsTopLevelItemsForDifferentOwningGroup,
  testListRelatedManiesDoesNotRedactPrimaryForSameOwningGroup,
  testListRelatedManiesRedactsPrimaryForDifferentOwningGroup,
  testListRelatedOnesDoesNotRedactPrimaryForSameOwningGroup,
  testListRelatedOnesRedactsPrimaryForDifferentOwningGroup,
  testOwningGroupCanGrantOtherGroupsPermissions,
  testUpdatePrimaryRedactsRelatedForDifferentOwningGroup,
  testUpdateRelatedManyRedactsPrimaryForDifferentOwningGroup,
  testUpdateRelatedOneRedactsPrimaryForDifferentOwningGroup,
  testCreatePrimaryRedactsRelatedForSameOwningGroup,
  testUpdatePrimaryRedactsRelatedForSameOwningGroup,
  testCreateRelatedOneRedactsPrimaryForSameOwningGroup,
  testUpdateRelatedOneRedactsPrimaryForSameOwningGroup,
  testCreateRelatedManyRedactsPrimaryForSameOwningGroup,
  testUpdateRelatedManyRedactsPrimaryForSameOwningGroup,
} from './test-implementations';

jest.setTimeout(DURATION_1_HOUR);

// Each of these tests asserts that restricted fields in associated types are properly redacted. To assert this, we create the relationship
// records in an order so that the type we're asserting on comes LAST. By "prepopulating" the associated records before creating the source
// record, we ensure that the selection set is fully populated with relationship data, and can therefore assert that restricted fields on
// the associated records are redacted.
describe('Relationships protected with dynamic group auth', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const baseProjFolderName = path.basename(__filename, '.test.ts');

  describe('DDB primary, DDB related', () => {
    const projFolderName = `${baseProjFolderName}-ddb-primary-ddb-related`;
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
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-primary.graphql'),
      );
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-related.graphql'),
      );
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'ddb-prim-ddb-related': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackConfig(projRoot, { prefix: 'DynGrpDdbDdb' });
      writeTestDefinitions(testDefinitions, projRoot);

      const testConfig = await deployStackAndCreateUsers({
        projRoot,
        region,
        name,
      });

      group1AccessToken = testConfig.group1AccessToken;
      group2AccessToken = testConfig.group2AccessToken;
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

    describe('Primary as source model', () => {
      test('createPrimary redacts models if created by same owning group', async () => {
        await testCreatePrimaryRedactsRelatedForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('createPrimary redacts related models if created by different owning group', async () => {
        await testCreatePrimaryRedactsRelatedForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('updatePrimary redacts related models if created by same owning group', async () => {
        await testUpdatePrimaryRedactsRelatedForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('updatePrimary redacts related models if created by different owning group', async () => {
        await testUpdatePrimaryRedactsRelatedForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('getPrimary shows related models if created by same owning group', async () => {
        await testGetPrimaryDoesNotRedactRelatedForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('getPrimary redacts related models if created by different owning group', async () => {
        await testGetPrimaryRedactsRelatedForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('listPrimaries shows related models if created by same owning group', async () => {
        await testListPrimariesDoesNotRedactRelatedForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('listPrimaries redacts related models if created by different owning group', async () => {
        await testGetPrimaryRedactsRelatedForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      // We will only test the following cases for the Primary model, since there is no interesting difference between
      // the use cases for GetRelated* or ListRelated*, or for assigning ownership permissions
      test('getPrimary unauthorized top-level item if created by different owning group', async () => {
        await testGetPrimaryUnauthorizedForDifferentOwner(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('listPrimaries redacts top-level items if created by different owning group', async () => {
        await testListPrimariesRedactsTopLevelItemsForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('owning group can grant other groups permissions', async () => {
        await testOwningGroupCanGrantOtherGroupsPermissions(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });
    });

    describe('RelatedOne as source model', () => {
      test('createRelatedOne redacts primary models if created by same owning group', async () => {
        await testCreateRelatedOneRedactsPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('createRelatedOne redacts primary models if created by different owning group', async () => {
        await testCreateRelatedOneRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('updateRelatedOne redacts primary models if created by same owning group', async () => {
        await testUpdateRelatedOneRedactsPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('updateRelatedOne redacts primary models if created by different owning group', async () => {
        await testUpdateRelatedOneRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('getRelatedOne does not redact primary models if created by same owning group', async () => {
        await testGetRelatedOneDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('getRelatedOne redacts primary models if created by different owning group', async () => {
        await testGetRelatedOneRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('listRelatedOnes does not redact primary models if created by same owning group', async () => {
        await testListRelatedOnesDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('listRelatedOnes redacts primary models if created by different owning group', async () => {
        await testListRelatedOnesRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });
    });

    describe('RelatedMany as source model', () => {
      test('createRelatedMany redacts related models if created by same owning group', async () => {
        await testCreateRelatedManyRedactsPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('createRelatedMany redacts related models if created by different owning group', async () => {
        await testCreateRelatedManyRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('updateRelatedMany redacts related models if created by same owning group', async () => {
        await testUpdateRelatedManyRedactsPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('updateRelatedMany redacts related models if created by different owning group', async () => {
        await testUpdateRelatedManyRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('getRelatedMany shows related models if created by same owning group', async () => {
        await testGetRelatedManyDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('getRelatedMany redacts related models if created by different owning group', async () => {
        await testGetRelatedManyRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('listRelatedManies shows related models if created by same owning group', async () => {
        await testListRelatedManiesDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('listRelatedManies redacts related models if created by different owning group', async () => {
        await testListRelatedManiesRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });
    });
  });
});

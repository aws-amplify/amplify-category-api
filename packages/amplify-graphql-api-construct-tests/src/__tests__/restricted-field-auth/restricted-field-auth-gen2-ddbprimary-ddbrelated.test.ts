import * as path from 'path';
import * as fs from 'fs-extra';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../../commands';
import { createCognitoUser, signInCognitoUser, TestDefinition, writeStackPrefix, writeTestDefinitions } from '../../utils';
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
  const baseProjFolderName = 'restricted-field-auth-gen2';

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
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'configurable-stack'));
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
});

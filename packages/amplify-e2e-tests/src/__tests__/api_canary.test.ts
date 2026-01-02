import path from 'path';
import { existsSync } from 'fs';
import {
  amplifyPush,
  deleteProject,
  initJSProjectWithProfile,
  addApiWithoutSchema,
  updateApiSchema,
  createNewProjectDir,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta,
  getDDBTable,
  amplifyRegions,
} from 'amplify-category-api-e2e-core';
import { STS } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { fromCognitoIdentity } from '@aws-sdk/credential-providers';

describe('amplify add api (GraphQL)', () => {
  let projRoot: string;
  let projFolderName: string;
  beforeEach(async () => {
    projFolderName = 'graphqlapi';
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
  });

  it('init a project and add the simple_model api', async () => {
    const envName = 'devtest';
    const projName = 'simplemodel';

    // 100% confirm what account we have credentials for
    const sts = new STS({
      credentials: fromIni({
        profile: 'amplify-integ-test-user',
      }),
    });
    console.log(await sts.getCallerIdentity());

    const awsRegion = await sts.config.region();
    console.log({ region: awsRegion });

    // We can't select this region because it's
    if (!amplifyRegions.includes(awsRegion)) {
      console.log(`THIS REGION (${awsRegion}) IS NOT SELECTABLE, SO SKIPPING TEST`);
      return;
    }

    await initJSProjectWithProfile(projRoot, { name: projName, envName });
    await addApiWithoutSchema(projRoot, { transformerVersion: 1 });
    await updateApiSchema(projRoot, projName, 'simple_model.graphql');
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);
    const region = meta.providers.awscloudformation.Region;
    const { output } = meta.api.simplemodel;
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, awsRegion);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);
    const tableName = `AmplifyDataStore-${graphqlApi.apiId}-${envName}`;
    const error = { message: null };
    try {
      const table = await getDDBTable(tableName, awsRegion);
      expect(table).toBeUndefined();
    } catch (ex) {
      Object.assign(error, ex);
    }
    expect(error).toBeDefined();
    expect(error.message).toContain(`${tableName} not found`);
  });
});

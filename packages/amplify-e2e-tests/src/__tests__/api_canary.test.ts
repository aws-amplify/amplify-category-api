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
import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader';

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
    const profile = 'amplify-integ-test-user';
    const amplifyRegion = (await loadSharedConfigFiles()).configFile?.[profile]?.region;
    const sts = new STS({
      credentials: fromIni({
        profile,
      }),
      region: amplifyRegion,
    });
    console.log(await sts.getCallerIdentity());
    console.log({ amplifyRegion });

    // We can't select this region because it's not in the Amplify CLI dropdown list.
    // The `amplify configure` command has already run and it probably picked a
    // default region like `us-east-1`. No matter, we won't use the config file it produced.
    if (!amplifyRegions.includes(amplifyRegion)) {
      console.log(`🌐 THIS REGION (${amplifyRegion}) IS NOT SELECTABLE IN THE AMPLIFY CLI, SO SKIPPING TEST 🌐`);
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
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, amplifyRegion);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);
    const tableName = `AmplifyDataStore-${graphqlApi.apiId}-${envName}`;
    const error = { message: null };
    try {
      const table = await getDDBTable(tableName, amplifyRegion);
      expect(table).toBeUndefined();
    } catch (ex) {
      Object.assign(error, ex);
    }
    expect(error).toBeDefined();
    expect(error.message).toContain(`${tableName} not found`);
  });
});

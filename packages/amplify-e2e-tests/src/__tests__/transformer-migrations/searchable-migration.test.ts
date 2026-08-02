import {
  initJSProjectWithProfile,
  deleteProject,
  amplifyPush,
  amplifyPushUpdate,
  addFeatureFlag,
  createRandomName,
  addAuthWithDefault,
  addApiWithoutSchema,
  updateApiSchema,
  getProjectMeta,
  createNewProjectDir,
  deleteProjectDir,
  tryScheduleCredentialRefresh,
} from 'amplify-category-api-e2e-core';
import gql from 'graphql-tag';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';

(global as any).fetch = require('node-fetch');

jest.setTimeout(150 * 60 * 1000); // 2.5 hours — searchable tests create ES domains which take 20-30 min each

describe('transformer model searchable migration test', () => {
  let projRoot: string;
  let projectName: string;
  let appSyncClient = undefined;

  beforeAll(() => {
    tryScheduleCredentialRefresh();
  });

  beforeEach(async () => {
    projectName = createRandomName();
    projRoot = await createNewProjectDir(createRandomName());
    await initJSProjectWithProfile(projRoot, {
      name: projectName,
    });
    await addAuthWithDefault(projRoot, {});
  });

  afterEach(async () => {
    try {
      await deleteProject(projRoot);
    } catch (e) {
      console.error(`Error deleting project: ${e.message}`);
    }
    deleteProjectDir(projRoot);
  });

  it('migration of searchable directive - search should return expected results', async () => {
    const v1Schema = 'transformer_migration/searchable-v1.graphql';
    const v2Schema = 'transformer_migration/searchable-v2.graphql';

    await addApiWithoutSchema(projRoot, { apiName: projectName, transformerVersion: 1 });
    await updateApiSchema(projRoot, projectName, v1Schema);
    await amplifyPush(projRoot);

    appSyncClient = getAppSyncClientFromProj(projRoot);
    await runAndValidateQuery('test1', 'test1', 10);

    await addFeatureFlag(projRoot, 'graphqltransformer', 'transformerVersion', 2);
    await addFeatureFlag(projRoot, 'graphqltransformer', 'useExperimentalPipelinedTransformer', true);

    await updateApiSchema(projRoot, projectName, v2Schema);
    await amplifyPushUpdate(projRoot);

    appSyncClient = getAppSyncClientFromProj(projRoot);
    await runAndValidateQuery('test2', 'test2', 10);
  });

  const getAppSyncClientFromProj = (projRoot: string) => {
    const meta = getProjectMeta(projRoot);
    if (!meta?.providers?.awscloudformation?.Region) {
      throw new Error(`Project metadata missing region. Meta keys: ${JSON.stringify(Object.keys(meta || {}))}`);
    }
    const region = meta.providers.awscloudformation.Region;

    if (!meta.api) {
      throw new Error(`Project metadata has no 'api' section. Meta keys: ${JSON.stringify(Object.keys(meta))}`);
    }
    if (!meta.api[projectName]) {
      const availableApis = Object.keys(meta.api);
      throw new Error(`API '${projectName}' not found in metadata. Available APIs: [${availableApis.join(', ')}]`);
    }

    const { output } = meta.api[projectName];
    if (!output?.GraphQLAPIEndpointOutput || !output?.GraphQLAPIKeyOutput) {
      throw new Error(`API output missing endpoint or key. Output: ${JSON.stringify(output)}`);
    }

    const url = output.GraphQLAPIEndpointOutput as string;
    const apiKey = output.GraphQLAPIKeyOutput as string;
    const appSyncClient = new AWSAppSyncClient({
      url,
      region,
      disableOffline: true,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey,
      },
    });
    return appSyncClient;
  };

  const fragments = [`fragment FullTodo on Todo { id name description count }`];

  const runMutation = async (query: string) => {
    try {
      const q = [query, ...fragments].join('\n');
      const response = await appSyncClient.mutate({
        mutation: gql(q),
        fetchPolicy: 'no-cache',
      });
      return response;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const createEntry = async (name: string, description: string, count: number) => {
    return await runMutation(getCreateTodosMutation(name, description, count));
  };

  function getCreateTodosMutation(name: string, description: string, count: number): string {
    return `mutation {
          createTodo(input: {
              name: "${name}"
              description: "${description}"
              count: ${count}
          }) { ...FullTodo }
      }`;
  }

  const runAndValidateQuery = async (name: string, description: string, count: number) => {
    const response = await createEntry(name, description, count);
    expect(response).toBeDefined();
    expect(response.errors).toBeUndefined();
    expect(response.data).toBeDefined();
    expect(response.data.createTodo).toBeDefined();
  };
});

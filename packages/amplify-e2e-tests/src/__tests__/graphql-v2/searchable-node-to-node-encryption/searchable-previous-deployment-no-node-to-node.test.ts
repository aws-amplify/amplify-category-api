import {
  addApiWithoutSchema,
  addAuthWithDefault,
  amplifyPush,
  amplifyPushUpdate,
  createNewProjectDir,
  createRandomName,
  deleteProject,
  deleteProjectDir,
  getProjectMeta,
  initJSProjectWithProfile,
  removeTransformConfigValue,
  setTransformConfigValue,
  updateApiSchema,
} from 'amplify-category-api-e2e-core';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import * as fs from 'fs-extra';
import gql from 'graphql-tag';
import * as path from 'path';

(global as any).fetch = require('node-fetch');

describe('searchable deployment when previous deployed state had node to node encryption disabled', () => {
  let projRoot: string;
  let projectName: string;
  let appSyncClient = undefined;

  beforeEach(async () => {
    projectName = createRandomName();
    projRoot = await createNewProjectDir(createRandomName());
    await initJSProjectWithProfile(projRoot, {
      name: projectName,
    });
    await addAuthWithDefault(projRoot, {});
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('if previous deployment had no NodeToNodeEncryption, carry state forward, there should be no data loss', async () => {
    const v2Schema = 'transformer_migration/searchable-v2.graphql';

    await addApiWithoutSchema(projRoot, { apiName: projectName });
    updateApiSchema(projRoot, projectName, v2Schema);

    const searchableStackPath = path.join(projRoot, 'amplify', 'backend', 'api', projectName, 'build', 'stacks', 'SearchableStack.json');

    // Initial Deploy with flag explicitly set
    setTransformConfigValue(projRoot, projectName, 'NodeToNodeEncryption', false);
    await amplifyPush(projRoot);

    appSyncClient = getAppSyncClientFromProj(projRoot);
    await runAndValidateQuery('test1', 'test1', 10, 1); // Expect a single record

    const searchableStackFirstDeploy = JSON.parse(fs.readFileSync(searchableStackPath).toString());
    const searchDomainPropsFirstDeploy = searchableStackFirstDeploy.Resources.OpenSearchDomain.Properties;

    expect(searchDomainPropsFirstDeploy).toHaveProperty('NodeToNodeEncryptionOptions');
    expect(searchDomainPropsFirstDeploy.NodeToNodeEncryptionOptions.Enabled).toEqual(false);

    // Subsequent deploy without flag set
    removeTransformConfigValue(projRoot, projectName, 'NodeToNodeEncryption');
    await amplifyPushUpdate(projRoot);

    appSyncClient = getAppSyncClientFromProj(projRoot);
    await runAndValidateQuery('test1', 'test1', 10, 2); // Expect two records

    const searchableStackSecondDeploy = JSON.parse(fs.readFileSync(searchableStackPath).toString());
    const searchDomainPropsSecondDeploy = searchableStackSecondDeploy.Resources.OpenSearchDomain.Properties;

    expect(searchDomainPropsSecondDeploy).toHaveProperty('NodeToNodeEncryptionOptions');
    expect(searchDomainPropsSecondDeploy.NodeToNodeEncryptionOptions.Enabled).toEqual(false);
  });

  const getAppSyncClientFromProj = (projRoot: string) => {
    const meta = getProjectMeta(projRoot);
    const region = meta['providers']['awscloudformation']['Region'] as string;
    const { output } = meta.api[projectName];
    const url = output.GraphQLAPIEndpointOutput as string;
    const apiKey = output.GraphQLAPIKeyOutput as string;

    return new AWSAppSyncClient({
      url,
      region,
      disableOffline: true,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey,
      },
    });
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

  const runQuery = async (query: string) => {
    try {
      const q = [query, ...fragments].join('\n');
      const response = await appSyncClient.query({
        query: gql(q),
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

  const searchTodos = async () => {
    return await runQuery(getTodos());
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

  function getTodos() {
    return `query {
      searchTodos {
        items {
          ...FullTodo
        }
      }
    }`;
  }

  const runAndValidateQuery = async (name: string, description: string, count: number, expectedRowCount: number) => {
    const response = await createEntry(name, description, count);
    expect(response).toBeDefined();
    expect(response.errors).toBeUndefined();
    expect(response.data).toBeDefined();
    expect(response.data.createTodo).toBeDefined();

    await waitForOSPropagate();
    const searchResponse = await searchTodos();

    expect(searchResponse).toBeDefined();
    expect(searchResponse.errors).toBeUndefined();
    expect(searchResponse.data).toBeDefined();
    expect(searchResponse.data.searchTodos).toBeDefined();
    expect(searchResponse.data.searchTodos.items).toHaveLength(expectedRowCount);
  };

  const waitForOSPropagate = async (initialWaitSeconds = 5, maxRetryCount = 5) => {
    const expectedCount = 1;
    let waitInMilliseconds = initialWaitSeconds * 1000;
    let currentRetryCount = 0;
    let searchResponse;

    do {
      await new Promise((r) => setTimeout(r, waitInMilliseconds));
      searchResponse = await searchTodos();
      currentRetryCount += 1;
      waitInMilliseconds = waitInMilliseconds * 2;
    } while (searchResponse.data.searchTodos?.items?.length < expectedCount && currentRetryCount <= maxRetryCount);
  };
});

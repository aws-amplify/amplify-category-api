import {
  addApiWithApiKeyAndLambda,
  addFunction,
  amplifyPush,
  createNewProjectDir,
  deleteProject,
  deleteProjectDir,
  getProjectMeta,
  initJSProjectWithProfile,
  updateApiSchema,
} from 'amplify-category-api-e2e-core';
import gql from 'graphql-tag';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');
// to deal with subscriptions in node env
(global as any).WebSocket = require('ws');

describe('custom queries and mutations in type extensions', () => {
  let projRoot: string;
  beforeEach(async () => {
    projRoot = await createNewProjectDir('ext-fields');
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('supports custom queries and mutations on type extensions', async () => {
    const envName = 'devtest';
    const projName = 'typeext';
    await initJSProjectWithProfile(projRoot, { name: projName, envName });
    await addFunction(projRoot, { functionTemplate: 'Hello World', name: 'myQuery1' }, 'nodejs');
    await addFunction(projRoot, { functionTemplate: 'Hello World', name: 'myQuery2' }, 'nodejs');
    await addApiWithApiKeyAndLambda(projRoot);
    await updateApiSchema(projRoot, projName, 'custom-operations-on-extensions.graphql');
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);
    const region = meta.providers.awscloudformation.Region;
    const { output } = meta.api[projName];
    const { GraphQLAPIEndpointOutput: url, GraphQLAPIKeyOutput: apiKey } = output;

    expect(url).toBeDefined();
    expect(apiKey).toBeDefined();

    const myQuery1 = /* GraphQL */ `
      query GetMyQuery1 {
        myQuery1
      }
    `;

    const myQuery2 = /* GraphQL */ `
      query GetMyQuery2 {
        myQuery2
      }
    `;

    // Both fields allow Lambda authorization, so we expect both to succeed, even though myQuery2 is declared and authorized in a type
    // extension
    const lambdaAppSyncClient = new AWSAppSyncClient({
      url,
      region,
      disableOffline: true,
      auth: {
        type: AUTH_TYPE.AWS_LAMBDA,
        token: 'custom-authorized',
      },
    });

    const lambdaQuery1Result: any = await lambdaAppSyncClient.query({
      query: gql(myQuery1),
      fetchPolicy: 'no-cache',
    });
    const rawData1 = lambdaQuery1Result.data.myQuery1;
    expect(rawData1).toContain('Hello from Lambda!');

    const lambdaQuery2Result: any = await lambdaAppSyncClient.query({
      query: gql(myQuery2),
      fetchPolicy: 'no-cache',
    });
    const rawData2 = lambdaQuery2Result.data.myQuery2;
    expect(rawData2).toContain('Hello from Lambda!');

    // Neither field allows API key authorization, so we expect both to fail, even though the default authorization mode is API_KEY
    const apiKeyAppSyncClient = new AWSAppSyncClient({
      url,
      region,
      disableOffline: true,
      auth: { type: AUTH_TYPE.API_KEY, apiKey },
    });

    await expect(
      async () =>
        await apiKeyAppSyncClient.query({
          query: gql(myQuery1),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myQuery1 on type Query');

    await expect(
      async () =>
        await apiKeyAppSyncClient.query({
          query: gql(myQuery2),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myQuery2 on type Query');
  });
});

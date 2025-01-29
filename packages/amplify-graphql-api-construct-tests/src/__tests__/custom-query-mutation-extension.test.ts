import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { parse } from 'graphql';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';

import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('custom queries and mutations in type extensions', () => {
  let projRoot: string;
  const projFolderName = 'typeext';

  const queryOnBaseType = /* GraphQL */ `
    query MyQuery {
      myFunctionQueryBase
      myHttpQueryBase
    }
  `;

  const queryOnExtendedType = /* GraphQL */ `
    query MyQuery {
      myFunctionQueryExtended
      myHttpQueryExtended
    }
  `;

  const mutationOnBaseType = /* GraphQL */ `
    mutation MyMutation {
      myFunctionMutationBase
      myHttpMutationBase
    }
  `;

  const mutationOnExtendedType = /* GraphQL */ `
    mutation MyMutation {
      myFunctionMutationExtended
      myHttpMutationExtended
    }
  `;

  const region = process.env.CLI_REGION ?? 'us-west-2';

  let apiKeyAppSyncClient: AWSAppSyncClient<any>;
  let lambdaAppSyncClient: AWSAppSyncClient<any>;

  beforeAll(async () => {
    projRoot = await createNewProjectDir(projFolderName);
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'custom-query-mutation-extension'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const apiEndpoint = outputs[name].awsAppsyncApiEndpoint;
    const apiKey = outputs[name].awsAppsyncApiKey;

    // All fields allow Lambda authorization, so we expect both to succeed
    lambdaAppSyncClient = new AWSAppSyncClient({
      url: apiEndpoint,
      region,
      disableOffline: true,
      auth: {
        type: AUTH_TYPE.AWS_LAMBDA,
        token: 'custom-authorized',
      },
    });

    // No field allows API key authorization, so we expect all to fail, even though the API's default authorization mode is API_KEY
    apiKeyAppSyncClient = new AWSAppSyncClient({
      url: apiEndpoint,
      region,
      disableOffline: true,
      auth: { type: AUTH_TYPE.API_KEY, apiKey },
    });
  });

  afterAll(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (err) {
      console.log(`Error invoking 'cdk destroy': ${err}`);
    }

    deleteProjectDir(projRoot);
  });

  test('authorized clients can access base Query fields', async () => {
    const lambdaBaseTypeQueryResult: any = await lambdaAppSyncClient.query({
      query: parse(queryOnBaseType),
      fetchPolicy: 'no-cache',
    });
    const { myFunctionQueryBase, myHttpQueryBase } = lambdaBaseTypeQueryResult.data;
    expect(myFunctionQueryBase).toContain('Hello from Lambda resolver');
    expect(myHttpQueryBase).toContain('Hello from API Gateway');
  });

  test('authorized clients can access extended Query fields', async () => {
    const lambdaExtendedTypeQueryResult: any = await lambdaAppSyncClient.query({
      query: parse(queryOnExtendedType),
      fetchPolicy: 'no-cache',
    });
    const { myFunctionQueryExtended, myHttpQueryExtended } = lambdaExtendedTypeQueryResult.data;
    expect(myFunctionQueryExtended).toContain('Hello from Lambda resolver');
    expect(myHttpQueryExtended).toContain('Hello from API Gateway');
  });

  test('authorized clients can access base Mutation fields', async () => {
    const lambdaBaseTypeMutationResult: any = await lambdaAppSyncClient.mutate({
      mutation: parse(mutationOnBaseType),
      fetchPolicy: 'no-cache',
    });
    const { myFunctionMutationBase, myHttpMutationBase } = lambdaBaseTypeMutationResult.data;
    expect(myFunctionMutationBase).toContain('Hello from Lambda resolver');
    expect(myHttpMutationBase).toContain('Hello from API Gateway');
  });

  test('authorized clients can access extended Mutation fields', async () => {
    const lambdaExtendedTypeMutationResult: any = await lambdaAppSyncClient.mutate({
      mutation: parse(mutationOnExtendedType),
      fetchPolicy: 'no-cache',
    });
    const { myFunctionMutationExtended, myHttpMutationExtended } = lambdaExtendedTypeMutationResult.data;
    expect(myFunctionMutationExtended).toContain('Hello from Lambda resolver');
    expect(myHttpMutationExtended).toContain('Hello from API Gateway');
  });

  test('unauthorized clients cannot access base Query fields', async () => {
    await expect(
      async () =>
        await apiKeyAppSyncClient.query({
          query: parse(queryOnBaseType),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myFunctionQueryBase on type Query');
  });

  test('unauthorized clients cannot access extended Query fields', async () => {
    await expect(
      async () =>
        await apiKeyAppSyncClient.query({
          query: parse(queryOnExtendedType),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myFunctionQueryExtended on type Query');
  });

  test('unauthorized clients cannot access base Mutation fields', async () => {
    await expect(
      async () =>
        await apiKeyAppSyncClient.mutate({
          mutation: parse(mutationOnBaseType),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myFunctionMutationBase on type Mutation');
  });

  test('unauthorized clients cannot access extended Mutation fields', async () => {
    await expect(
      async () =>
        await apiKeyAppSyncClient.mutate({
          mutation: parse(mutationOnExtendedType),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myFunctionMutationExtended on type Mutation');
  });
});

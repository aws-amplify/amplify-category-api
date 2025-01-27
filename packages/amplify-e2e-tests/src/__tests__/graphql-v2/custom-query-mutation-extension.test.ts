import * as fs from 'fs';
import * as path from 'path';
import {
  addApiWithApiKeyAndLambda,
  addFunction,
  addRestApi,
  amplifyPush,
  amplifyPushUpdate,
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

  // afterEach(async () => {
  //   await deleteProject(projRoot);
  //   deleteProjectDir(projRoot);
  // });

  it('supports custom queries and mutations on type extensions', async () => {
    const envName = 'devtest';
    const projName = 'typeext';
    await initJSProjectWithProfile(projRoot, { name: projName, envName });

    // We will deploy this project in 2 phases:
    // 1. Add a REST endpoint to be used to resolve @http queries. We will use the same endpoint for each, since what we care about is
    //    Amplify's ability to properly set up the `@auth` and `@http` resolvers for the custom fields.
    // 2. Add a GraphQL API with `@http` custom operations that resolve to the REST endpoint added above. Add 2 Lambda functions to resolve
    //    the `@function` custom operations.

    // Deploy, phase 1: REST endpoint; REST Lambda function
    await addFunction(projRoot, { functionTemplate: 'Hello World', name: 'myRestFunction' }, 'nodejs');

    await addRestApi(projRoot, {
      existingLambda: true,
      restrictAccess: false,
      allowGuestUsers: true,
    });

    // `amplifyPush` expects GraphQL-specific prompts -- don't use that yet
    await amplifyPushUpdate(projRoot);

    let meta = getProjectMeta(projRoot);
    const region = meta.providers.awscloudformation.Region;
    // REST API name isn't easily deriveable, but we know at this point there is only one member of the API meta
    const restApiName = Object.keys(meta.api)[0];
    const { RootUrl: restUrl } = meta.api[restApiName].output;
    expect(restUrl).toBeDefined();

    // Deploy, phase 2: Lambda functions to resolve `@function` custom operations; GraphQL API; and Lambda authorizer
    await addFunction(projRoot, { functionTemplate: 'Hello World', name: 'myFunctionQueryBase' }, 'nodejs');
    await addFunction(projRoot, { functionTemplate: 'Hello World', name: 'myFunctionQueryExtended' }, 'nodejs');

    await addApiWithApiKeyAndLambda(projRoot);
    await updateApiSchema(projRoot, projName, 'custom-operations-on-extensions.graphql');

    // Update the `@http` directives with the APIGW endpoint
    const schemaPath = path.resolve(path.join(projRoot, 'amplify', 'backend', 'api', projName, 'schema.graphql'));
    const updatedSchema = fs
      .readFileSync(schemaPath, 'utf8')
      .toString()
      .replace(/<REST_URL>/g, `${restUrl}/items`);
    fs.writeFileSync(schemaPath, updatedSchema);

    // `amplifyPush` can handle pushes to updated projects, as well as new projects, as long as it contains a GraphQL API
    await amplifyPush(projRoot);

    meta = getProjectMeta(projRoot);
    const { GraphQLAPIEndpointOutput: appsyncUrl, GraphQLAPIKeyOutput: apiKey } = meta.api[projName].output;

    expect(appsyncUrl).toBeDefined();
    expect(apiKey).toBeDefined();

    // All fields allow Lambda authorization, so we expect both to succeed
    const lambdaAppSyncClient = new AWSAppSyncClient({
      url: appsyncUrl,
      region,
      disableOffline: true,
      auth: {
        type: AUTH_TYPE.AWS_LAMBDA,
        token: 'custom-authorized',
      },
    });

    // No field allows API key authorization, so we expect all to fail, even though the API's default authorization mode is API_KEY
    const apiKeyAppSyncClient = new AWSAppSyncClient({
      url: appsyncUrl,
      region,
      disableOffline: true,
      auth: { type: AUTH_TYPE.API_KEY, apiKey },
    });

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

    // Authorized client: Base type query
    const lambdaBaseTypeQueryResult: any = await lambdaAppSyncClient.query({
      query: gql(queryOnBaseType),
      fetchPolicy: 'no-cache',
    });
    const { myFunctionQueryBase, myHttpQueryBase } = lambdaBaseTypeQueryResult.data;
    expect(myFunctionQueryBase).toContain('Hello from Lambda!');
    expect(myHttpQueryBase).toContain('Hello from Lambda!');

    // Authorized client: Extended type query
    const lambdaExtendedTypeQueryResult: any = await lambdaAppSyncClient.query({
      query: gql(queryOnExtendedType),
      fetchPolicy: 'no-cache',
    });
    const { myFunctionQueryExtended, myHttpQueryExtended } = lambdaExtendedTypeQueryResult.data;
    expect(myFunctionQueryExtended).toContain('Hello from Lambda!');
    expect(myHttpQueryExtended).toContain('Hello from Lambda!');

    // Authorized client: Base type mutation
    const lambdaBaseTypeMutationResult: any = await lambdaAppSyncClient.mutate({
      mutation: gql(mutationOnBaseType),
      fetchPolicy: 'no-cache',
    });
    const { myFunctionMutationBase, myHttpMutationBase } = lambdaBaseTypeMutationResult.data;
    expect(myFunctionMutationBase).toContain('Hello from Lambda!');
    expect(myHttpMutationBase).toContain('Hello from Lambda!');

    // Authorized client: Extended type mutation
    const lambdaExtendedTypeMutationResult: any = await lambdaAppSyncClient.mutate({
      mutation: gql(mutationOnExtendedType),
      fetchPolicy: 'no-cache',
    });
    const { myFunctionMutationExtended, myHttpMutationExtended } = lambdaExtendedTypeMutationResult.data;
    expect(myFunctionMutationExtended).toContain('Hello from Lambda!');
    expect(myHttpMutationExtended).toContain('Hello from Lambda!');

    // Unauthorized client: Base type query
    await expect(
      async () =>
        await apiKeyAppSyncClient.query({
          query: gql(queryOnBaseType),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myFunctionQueryBase on type Query');

    // Unauthorized client: Extended type query
    await expect(
      async () =>
        await apiKeyAppSyncClient.query({
          query: gql(queryOnExtendedType),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myFunctionQueryExtended on type Query');

    // Unauthorized client: Base type mutation
    await expect(
      async () =>
        await apiKeyAppSyncClient.mutate({
          mutation: gql(mutationOnBaseType),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myFunctionMutationBase on type Mutation');

    // Unauthorized client: Extended type mutation
    await expect(
      async () =>
        await apiKeyAppSyncClient.mutate({
          mutation: gql(mutationOnExtendedType),
          fetchPolicy: 'no-cache',
        }),
    ).rejects.toThrow('GraphQL error: Not Authorized to access myFunctionMutationExtended on type Mutation');
  });
});

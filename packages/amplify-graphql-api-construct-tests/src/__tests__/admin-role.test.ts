import * as path from 'path';
import * as crypto from 'crypto';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';
import { invokeGraphqlProxyLambda } from '../lambda-request';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import type { CreateTodoHandlerEvent, CreateTodoResponseData } from './backends/admin-role/apiInvoker';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK Auth Modes', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir('adminrole');
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('Can be invoked with Admin Roles defined', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'admin-role'));
    const name = await initCDKProject(projRoot, templatePath, {
      cdkVersion: '2.129.0', // Explicitly declaring this, since this version needs to match cognito idp
      additionalDependencies: [
        'esbuild', // required to bundle the lambda function
        '@aws-cdk/aws-cognito-identitypool-alpha@2.129.0-alpha.0', // using alpha cognito idp resource for auth config
        '@aws-crypto/sha256-js', // All remaining deps are required for the lambda to sign the request to appsync
        '@aws-sdk/credential-provider-node',
        '@aws-sdk/protocol-http',
        '@aws-sdk/signature-v4',
        'node-fetch',
      ],
    });
    const outputs = await cdkDeploy(projRoot, '--all');
    const {
      awsAppsyncApiEndpoint: apiEndpoint,
      awsAppsyncApiKey: apiKey,
      ApiInvokerFunctionName: functionName,
      awsAppsyncRegion: region,
    } = outputs[name];

    const testTitle = crypto.randomUUID();

    // Validate that the lambda can be invoked to create a record via signed IAM admin role.
    const invokeResult = await invokeGraphqlProxyLambda<CreateTodoHandlerEvent, CreateTodoResponseData>(
      functionName,
      { title: testTitle },
      region,
    );

    // And the result object is returned
    expect(invokeResult.createTodo.title).toEqual(testTitle);

    // And a user with apiKey can retrieve the record, and data lines up
    const adminRecordQueryResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query GET_TODO {
          getTodo(id: "${invokeResult.createTodo.id}") {
            id
            title
          }
        }
      `,
    );
    expect(adminRecordQueryResult.statusCode).toEqual(200);
    expect(adminRecordQueryResult.body.data.getTodo.title).toEqual(testTitle);
  });
});

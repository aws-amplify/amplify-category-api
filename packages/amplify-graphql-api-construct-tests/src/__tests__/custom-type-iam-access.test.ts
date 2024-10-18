import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import {
  getPayloadStringForGraphqlRequest,
  getSigV4SignedAppSyncRequest,
  graphqlRequest,
  sigV4SignedRequestToNodeFetchRequest,
} from '../utils/appsync-graphql/graphql-request';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { getAccountFromArn, writeStackConfig } from '../utils';

jest.setTimeout(DURATION_1_HOUR);

const region = process.env.CLI_REGION ?? 'us-west-2';
const account = process.env.AWS_ACCOUNT ?? getAccountFromArn(process.env.TEST_ACCOUNT_ROLE);
if (!account) {
  throw new Error(
    'Must specify either AWS_ACCOUNT or TEST_ACCOUNT_ROLE environment variables. (CodeBuild sets TEST_ACCOUNT_ROLE automatically)',
  );
}

// This test suite creates a stack with only custom operations, and a test role. It variously tests creating the stack with and without
// `enableIamAuthorizationMode` enabled. We expect that requests authorized by assuming the test role will succeed if
// enableIamAuthorizationMode is true, and fail otherwise.
describe('Implicit IAM support on custom operations', () => {
  describe.each([{ enableIamAuthorizationMode: true }, { enableIamAuthorizationMode: false }])(
    'Supports implicit IAM authorization on custom operations with scalar values when enableIamAuthorizationMode is %b',
    ({ enableIamAuthorizationMode }) => {
      /** Directory in which the project files are stored */
      let projRoot: string;

      /** Endpoint of the AppSync GraphQL API */
      let apiEndpoint: string;

      /** Prefix for stack resources and sts:AssumeRole sessions */
      let prefix: string;

      /** The Test Role that will be assumed by graphQL calls to test IAM access */
      let testRoleArn: string;

      beforeAll(async () => {
        prefix = `Iam${enableIamAuthorizationMode ? 'Enabled' : 'Disabled'}Test`;
        const projFolderName = `iam-auth-${enableIamAuthorizationMode}`;
        projRoot = await createNewProjectDir(projFolderName);
        const templatePath = path.resolve(path.join(__dirname, 'backends', 'custom-type-iam-access-stack'));
        const name = await initCDKProject(projRoot, templatePath);

        // Note that we don't need to write a test definition -- we'll reuse a hardcoded definition in the stack itself
        writeStackConfig(projRoot, {
          prefix,
          partialAuthorizationModes: {
            iamConfig: {
              enableIamAuthorizationMode: enableIamAuthorizationMode,
            },
          },
          testRoleProps: {
            assumedByAccount: account,
          },
        });

        const testConfig = await deployStack({
          projRoot,
          name,
        });

        apiEndpoint = testConfig.apiEndpoint;
        testRoleArn = testConfig.testRoleArn;
      });

      afterAll(async () => {
        try {
          await cdkDestroy(projRoot, '--all');
        } catch (err) {
          console.log(`Error invoking 'cdk destroy': ${err}`);
        }

        deleteProjectDir(projRoot);
      });

      test(`${
        enableIamAuthorizationMode ? 'Allows' : 'Denies'
      } access to a mutation returning a scalar value when enableIamAuthorizationMode is ${enableIamAuthorizationMode}`, async () => {
        const query = /* GraphQL */ `
          mutation TestMutation {
            updateScalar
          }
        `;
        const signedRequest = await getSigV4SignedAppSyncRequest({
          body: getPayloadStringForGraphqlRequest(query),
          endpoint: apiEndpoint,
          region,
          roleArn: testRoleArn,
          sessionNamePrefix: `${prefix}-${Date.now()}`,
        });

        const request = sigV4SignedRequestToNodeFetchRequest(signedRequest);

        const result = await graphqlRequest(request);

        const expectedStatusCode = enableIamAuthorizationMode ? 200 : 400;
        expect(result.statusCode).toEqual(expectedStatusCode);

        /* eslint-disable jest/no-conditional-expect */
        if (enableIamAuthorizationMode) {
          expect(result.body.data.updateScalar).toEqual('test-value-Mutation-updateScalar');
          expect(result.body.errors).not.toBeDefined();
        } else {
          expect(result.body.errors[0].errorType).toEqual('Unauthorized');
          expect(result.body.errors[0].message).toEqual('Not Authorized to access updateScalar on type Mutation');
        }
        /* eslint-enable jest/no-conditional-expect */
      });

      test(`${
        enableIamAuthorizationMode ? 'Allows' : 'Denies'
      } access to a query returning a scalar value when enableIamAuthorizationMode is ${enableIamAuthorizationMode}`, async () => {
        const query = /* GraphQL */ `
          query TestQuery {
            getScalar
          }
        `;
        const signedRequest = await getSigV4SignedAppSyncRequest({
          body: getPayloadStringForGraphqlRequest(query),
          endpoint: apiEndpoint,
          region,
          roleArn: testRoleArn,
          sessionNamePrefix: `${prefix}-${Date.now()}`,
        });

        const request = sigV4SignedRequestToNodeFetchRequest(signedRequest);

        const result = await graphqlRequest(request);

        const expectedStatusCode = enableIamAuthorizationMode ? 200 : 400;
        expect(result.statusCode).toEqual(expectedStatusCode);

        /* eslint-disable jest/no-conditional-expect */
        if (enableIamAuthorizationMode) {
          expect(result.body.data.getScalar).toEqual('test-value-Query-getScalar');
          expect(result.body.errors).not.toBeDefined();
        } else {
          expect(result.body.errors[0].errorType).toEqual('Unauthorized');
          expect(result.body.errors[0].message).toEqual('Not Authorized to access getScalar on type Query');
        }
        /* eslint-enable jest/no-conditional-expect */
      });

      test(`${
        enableIamAuthorizationMode ? 'Allows' : 'Denies'
      } access to a mutation returning a custom type when enableIamAuthorizationMode is ${enableIamAuthorizationMode}`, async () => {
        const query = /* GraphQL */ `
          mutation TestMutation {
            updateCustomType {
              value
            }
          }
        `;
        const signedRequest = await getSigV4SignedAppSyncRequest({
          body: getPayloadStringForGraphqlRequest(query),
          endpoint: apiEndpoint,
          region,
          roleArn: testRoleArn,
          sessionNamePrefix: `${prefix}-${Date.now()}`,
        });

        const request = sigV4SignedRequestToNodeFetchRequest(signedRequest);

        const result = await graphqlRequest(request);

        const expectedStatusCode = enableIamAuthorizationMode ? 200 : 400;
        expect(result.statusCode).toEqual(expectedStatusCode);

        /* eslint-disable jest/no-conditional-expect */
        if (enableIamAuthorizationMode) {
          expect(result.body.data.updateCustomType.value).toEqual('test-value-Mutation-updateCustomType');
          expect(result.body.errors).not.toBeDefined();
        } else {
          expect(result.body.errors[0].errorType).toEqual('Unauthorized');
          expect(result.body.errors[0].message).toEqual('Not Authorized to access updateCustomType on type Mutation');
        }
        /* eslint-enable jest/no-conditional-expect */
      });

      test(`${
        enableIamAuthorizationMode ? 'Allows' : 'Denies'
      } access to a query returning a custom type when enableIamAuthorizationMode is ${enableIamAuthorizationMode}`, async () => {
        const query = /* GraphQL */ `
          query TestQuery {
            getCustomType {
              value
            }
          }
        `;
        const signedRequest = await getSigV4SignedAppSyncRequest({
          body: getPayloadStringForGraphqlRequest(query),
          endpoint: apiEndpoint,
          region,
          roleArn: testRoleArn,
          sessionNamePrefix: `${prefix}-${Date.now()}`,
        });

        const request = sigV4SignedRequestToNodeFetchRequest(signedRequest);

        const result = await graphqlRequest(request);

        const expectedStatusCode = enableIamAuthorizationMode ? 200 : 400;
        expect(result.statusCode).toEqual(expectedStatusCode);

        /* eslint-disable jest/no-conditional-expect */
        if (enableIamAuthorizationMode) {
          expect(result.body.data.getCustomType.value).toEqual('test-value-Query-getCustomType');
          expect(result.body.errors).not.toBeDefined();
        } else {
          expect(result.body.errors[0].errorType).toEqual('Unauthorized');
          expect(result.body.errors[0].message).toEqual('Not Authorized to access getCustomType on type Query');
        }
        /* eslint-enable jest/no-conditional-expect */
      });
    },
  );
});

interface CommonSetupInput {
  projRoot: string;
  name: string;
}

interface CommonSetupOutput {
  apiEndpoint: string;
  testRoleArn: string;
}

const deployStack = async (input: CommonSetupInput): Promise<CommonSetupOutput> => {
  const { projRoot, name } = input;
  const outputs = await cdkDeploy(projRoot, '--all');
  const { awsAppsyncApiEndpoint: apiEndpoint, awsIamTestRoleArn: testRoleArn } = outputs[name];

  const output: CommonSetupOutput = {
    apiEndpoint,
    testRoleArn,
  };

  return output;
};

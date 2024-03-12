import { ResourceConstants } from 'graphql-transformer-common';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { FunctionTransformer } from '@aws-amplify/graphql-function-transformer';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { Output } from 'aws-sdk/clients/cloudformation';
import { default as moment } from 'moment';
import { default as S3 } from 'aws-sdk/clients/s3';
import { default as STS } from 'aws-sdk/clients/sts';
import { default as Organizations } from 'aws-sdk/clients/organizations';
import AWS from 'aws-sdk';
import { CloudFormationClient } from '../CloudFormationClient';
import { GraphQLClient } from '../GraphQLClient';
import { cleanupStackAfterTest, deploy } from '../deployNestedStacks';
import { S3Client } from '../S3Client';
import { LambdaHelper } from '../LambdaHelper';
import { IAMHelper } from '../IAMHelper';
import { resolveTestRegion } from '../testSetup';

const region = resolveTestRegion();

jest.setTimeout(2000000);

const cf = new CloudFormationClient(region);
const customS3Client = new S3Client(region);
const awsS3Client = new S3({ region: region });
const sts = new STS();
const organizations = new Organizations({ region: 'us-east-1' });
const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const STACK_NAME = `FunctionTransformerTestsV2-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `appsync-function-transformer-test-bucket-v2-${BUILD_TIMESTAMP}`;
const LOCAL_FS_BUILD_DIR = '/tmp/function_transformer_tests_v2/';
const S3_ROOT_DIR_KEY = 'deployments';
const ECHO_FUNCTION_NAME = `long-prefix-e2e-test-functions-echo-dev-v2-${BUILD_TIMESTAMP}`;
const HELLO_FUNCTION_NAME = `long-prefix-e2e-test-functions-hello-v2-${BUILD_TIMESTAMP}`;
const LAMBDA_EXECUTION_ROLE_NAME = `amplify_e2e_tests_lambda_basic_v2_${BUILD_TIMESTAMP}`;
const LAMBDA_EXECUTION_POLICY_NAME = `amplify_e2e_tests_lambda_basic_access_v2_${BUILD_TIMESTAMP}`;
let LAMBDA_EXECUTION_POLICY_ARN = '';
let CROSS_ACCOUNT_LAMBDA_EXECUTION_POLICY_ARN = '';

let GRAPHQL_CLIENT = undefined;

const LAMBDA_HELPER = new LambdaHelper();
const IAM_HELPER = new IAMHelper();
const shortWaitForResource = 5000;
const longWaitForResource = 10000;

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

const createEchoFunctionInOtherAccount = async (currentAccountId?: string) => {
  if (!currentAccountId) {
    return;
  }
  try {
    const childAccounts = (await organizations.listAccounts({}).promise())?.Accounts;
    if (!childAccounts || childAccounts?.length < 1) {
      console.warn('Could not find any child accounts attached to current account');
      expect(true).toEqual(false);
      return;
    }
    const otherAccountId = childAccounts[0]?.Id;
    if (!otherAccountId) {
      console.warn('Could not choose other account to create lambda function');
      expect(true).toEqual(false);
      return;
    }
    const childAccountRoleARN = `arn:aws:iam::${otherAccountId}:role/OrganizationAccountAccessRole`;
    const accountCredentials = (
      await sts
        .assumeRole({
          RoleArn: childAccountRoleARN,
          RoleSessionName: `testCrossAccountFunction${BUILD_TIMESTAMP}`,
          DurationSeconds: 900,
        })
        .promise()
    )?.Credentials;
    if (!accountCredentials?.AccessKeyId || !accountCredentials?.SecretAccessKey || !accountCredentials?.SessionToken) {
      console.warn('Could not assume role to access child account');
      expect(true).toEqual(false);
      return;
    }
    const crossAccountLambdaHelper = new LambdaHelper(
      region,
      new AWS.Credentials(accountCredentials.AccessKeyId, accountCredentials.SecretAccessKey, accountCredentials.SessionToken),
    );
    const crossAccountIAMHelper = new IAMHelper(
      region,
      new AWS.Credentials(accountCredentials.AccessKeyId, accountCredentials.SecretAccessKey, accountCredentials.SessionToken),
    );
    const role = await crossAccountIAMHelper.createLambdaExecutionRole(LAMBDA_EXECUTION_ROLE_NAME);
    await wait(shortWaitForResource);
    const policy = await crossAccountIAMHelper.createLambdaExecutionPolicy(LAMBDA_EXECUTION_POLICY_NAME);
    await wait(shortWaitForResource);
    CROSS_ACCOUNT_LAMBDA_EXECUTION_POLICY_ARN = policy?.Policy?.Arn;
    await crossAccountIAMHelper.attachPolicy(policy?.Policy?.Arn, role.Role.RoleName);
    await wait(longWaitForResource);
    await crossAccountLambdaHelper.createFunction(ECHO_FUNCTION_NAME, role.Role.Arn, 'echoFunction');
    await crossAccountLambdaHelper.addAppSyncCrossAccountAccess(currentAccountId, ECHO_FUNCTION_NAME);
    return otherAccountId;
  } catch (e) {
    console.warn(`Could not create echo function in other account: ${e}`);
    expect(true).toEqual(false);
    return;
  }
};

const deleteEchoFunctionInOtherAccount = async (accountId: string) => {
  try {
    const childAccountRoleARN = `arn:aws:iam::${accountId}:role/OrganizationAccountAccessRole`;
    const accountCredentials = (
      await sts
        .assumeRole({
          RoleArn: childAccountRoleARN,
          RoleSessionName: `testCrossAccountFunction${BUILD_TIMESTAMP}`,
          DurationSeconds: 900,
        })
        .promise()
    )?.Credentials;
    if (!accountCredentials?.AccessKeyId || !accountCredentials?.SecretAccessKey || !accountCredentials?.SessionToken) {
      console.warn('Could not assume role to access child account');
      expect(true).toEqual(false);
      return;
    }
    const crossAccountLambdaHelper = new LambdaHelper(
      region,
      new AWS.Credentials(accountCredentials.AccessKeyId, accountCredentials.SecretAccessKey, accountCredentials.SessionToken),
    );
    const crossAccountIAMHelper = new IAMHelper(
      region,
      new AWS.Credentials(accountCredentials.AccessKeyId, accountCredentials.SecretAccessKey, accountCredentials.SessionToken),
    );

    await crossAccountLambdaHelper.deleteFunction(ECHO_FUNCTION_NAME);
    await crossAccountIAMHelper.detachPolicy(CROSS_ACCOUNT_LAMBDA_EXECUTION_POLICY_ARN, LAMBDA_EXECUTION_ROLE_NAME);
    await crossAccountIAMHelper.deleteRole(LAMBDA_EXECUTION_ROLE_NAME);
    await crossAccountIAMHelper.deletePolicy(CROSS_ACCOUNT_LAMBDA_EXECUTION_POLICY_ARN);
  } catch (e) {
    console.warn(`Could not delete echo function in other account: ${e}`);
    expect(true).toEqual(false);
    return;
  }
};

const getCurrentAccountId = async () => {
  try {
    const accountDetails = await sts.getCallerIdentity({}).promise();
    return accountDetails?.Account;
  } catch (e) {
    console.warn(`Could not get current AWS account ID: ${e}`);
    expect(true).toEqual(false);
  }
};

let otherAccountId: string | undefined;

beforeAll(async () => {
  const currAccountId = await getCurrentAccountId();
  otherAccountId = await createEchoFunctionInOtherAccount(currAccountId);
  console.info('using child account:' + otherAccountId + ' to create echo lambda function');
  const validSchema = `
    type Query {
        echo(msg: String!): Context @function(name: "${ECHO_FUNCTION_NAME}")
        echoEnv(msg: String!): Context @function(name: "long-prefix-e2e-test-functions-echo-\${env}-v2-${BUILD_TIMESTAMP}")
        duplicate(msg: String!): Context @function(name: "long-prefix-e2e-test-functions-echo-dev-v2-${BUILD_TIMESTAMP}")
        pipeline(msg: String!): String
            @function(name: "${ECHO_FUNCTION_NAME}")
            @function(name: "${HELLO_FUNCTION_NAME}")
        pipelineReverse(msg: String!): Context
            @function(name: "${HELLO_FUNCTION_NAME}")
            @function(name: "${ECHO_FUNCTION_NAME}")
        echoFromSameAccount(msg: String!): Context @function(name: "${ECHO_FUNCTION_NAME}", accountId: "${currAccountId}")
        echoFromDifferentAccount(msg: String!): Context @function(name: "${ECHO_FUNCTION_NAME}", accountId: "${otherAccountId}")
    }
    type Context {
        arguments: Arguments
        typeName: String
        fieldName: String
    }
    type Arguments {
        msg: String!
    }
    `;
  try {
    await awsS3Client.createBucket({ Bucket: BUCKET_NAME }).promise();
  } catch (e) {
    console.warn(`Could not create bucket: ${e}`);
    expect(true).toEqual(false);
  }
  try {
    const role = await IAM_HELPER.createLambdaExecutionRole(LAMBDA_EXECUTION_ROLE_NAME);
    await wait(shortWaitForResource);
    const policy = await IAM_HELPER.createLambdaExecutionPolicy(LAMBDA_EXECUTION_POLICY_NAME);
    await wait(shortWaitForResource);
    LAMBDA_EXECUTION_POLICY_ARN = policy.Policy.Arn;
    await IAM_HELPER.attachPolicy(policy.Policy.Arn, role.Role.RoleName);
    await wait(longWaitForResource);
    await LAMBDA_HELPER.createFunction(ECHO_FUNCTION_NAME, role.Role.Arn, 'echoFunction');
    await LAMBDA_HELPER.createFunction(HELLO_FUNCTION_NAME, role.Role.Arn, 'hello');
  } catch (e) {
    console.warn(`Could not setup function: ${e}`);
    expect(true).toEqual(false);
  }
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'API_KEY',
      },
      additionalAuthenticationProviders: [],
    },
    transformers: [new ModelTransformer(), new FunctionTransformer(), new AuthTransformer()],
  });
  const finishedStack = await deploy(
    customS3Client,
    cf,
    STACK_NAME,
    out,
    { env: 'dev' },
    LOCAL_FS_BUILD_DIR,
    BUCKET_NAME,
    S3_ROOT_DIR_KEY,
    BUILD_TIMESTAMP,
  );
  // Arbitrary wait to make sure everything is ready.
  await cf.wait(5, () => Promise.resolve());
  expect(finishedStack).toBeDefined();
  const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
  const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
  const endpoint = getApiEndpoint(finishedStack.Outputs);
  const apiKey = getApiKey(finishedStack.Outputs);
  expect(apiKey).toBeDefined();
  expect(endpoint).toBeDefined();
  GRAPHQL_CLIENT = new GraphQLClient(endpoint, { 'x-api-key': apiKey });
});

afterAll(async () => {
  await cleanupStackAfterTest(BUCKET_NAME, STACK_NAME, cf);

  try {
    await LAMBDA_HELPER.deleteFunction(ECHO_FUNCTION_NAME);
  } catch (e) {
    console.warn(`Error during function cleanup: ${e}`);
  }
  try {
    await LAMBDA_HELPER.deleteFunction(HELLO_FUNCTION_NAME);
  } catch (e) {
    console.warn(`Error during function cleanup: ${e}`);
  }
  try {
    await IAM_HELPER.detachPolicy(LAMBDA_EXECUTION_POLICY_ARN, LAMBDA_EXECUTION_ROLE_NAME);
  } catch (e) {
    console.warn(`Error during policy dissociation: ${e}`);
  }
  try {
    await IAM_HELPER.deleteRole(LAMBDA_EXECUTION_ROLE_NAME);
  } catch (e) {
    console.warn(`Error during role cleanup: ${e}`);
  }
  try {
    await IAM_HELPER.deletePolicy(LAMBDA_EXECUTION_POLICY_ARN);
  } catch (e) {
    console.warn(`Error during policy cleanup: ${e}`);
  }
  if (otherAccountId) {
    await deleteEchoFunctionInOtherAccount(otherAccountId);
  }
});

/**
 * Test queries below
 */
test('simple echo function', async () => {
  const response = await GRAPHQL_CLIENT.query(
    `query {
        echo(msg: "Hello") {
            arguments {
                msg
            }
            typeName
            fieldName
        }
    }`,
    {},
  );
  expect(response.data.echo.arguments.msg).toEqual('Hello');
  expect(response.data.echo.typeName).toEqual('Query');
  expect(response.data.echo.fieldName).toEqual('echo');
});

test('simple echoEnv function', async () => {
  const response = await GRAPHQL_CLIENT.query(
    `query {
        echoEnv(msg: "Hello") {
            arguments {
                msg
            }
            typeName
            fieldName
        }
    }`,
    {},
  );
  expect(response.data.echoEnv.arguments.msg).toEqual('Hello');
  expect(response.data.echoEnv.typeName).toEqual('Query');
  expect(response.data.echoEnv.fieldName).toEqual('echoEnv');
});

test('simple duplicate function', async () => {
  const response = await GRAPHQL_CLIENT.query(
    `query {
        duplicate(msg: "Hello") {
            arguments {
                msg
            }
            typeName
            fieldName
        }
    }`,
    {},
  );
  expect(response.data.duplicate.arguments.msg).toEqual('Hello');
  expect(response.data.duplicate.typeName).toEqual('Query');
  expect(response.data.duplicate.fieldName).toEqual('duplicate');
});

test('pipeline of @function(s)', async () => {
  const response = await GRAPHQL_CLIENT.query(
    `query {
        pipeline(msg: "IGNORED")
    }`,
    {},
  );
  expect(response.data.pipeline).toEqual('Hello, world!');
});

test('pipelineReverse of @function(s)', async () => {
  const response = await GRAPHQL_CLIENT.query(
    `query {
        pipelineReverse(msg: "Hello") {
            arguments {
                msg
            }
            typeName
            fieldName
        }
    }`,
    {},
  );
  expect(response.data.pipelineReverse.arguments.msg).toEqual('Hello');
  expect(response.data.pipelineReverse.typeName).toEqual('Query');
  expect(response.data.pipelineReverse.fieldName).toEqual('pipelineReverse');
});

test('echo function with accountId as the same AWS account', async () => {
  const response = await GRAPHQL_CLIENT.query(
    `query {
        echoFromSameAccount(msg: "Hello") {
            arguments {
                msg
            }
            typeName
            fieldName
        }
    }`,
    {},
  );
  expect(response.data.echoFromSameAccount.arguments.msg).toEqual('Hello');
  expect(response.data.echoFromSameAccount.typeName).toEqual('Query');
  expect(response.data.echoFromSameAccount.fieldName).toEqual('echoFromSameAccount');
});

test('echo function with accountId as the different AWS account', async () => {
  const response = await GRAPHQL_CLIENT.query(
    `query {
        echoFromDifferentAccount(msg: "Hello") {
            arguments {
                msg
            }
            typeName
            fieldName
        }
    }`,
    {},
  );
  expect(response.data.echoFromDifferentAccount.arguments.msg).toEqual('Hello');
  expect(response.data.echoFromDifferentAccount.typeName).toEqual('Query');
  expect(response.data.echoFromDifferentAccount.fieldName).toEqual('echoFromDifferentAccount');
});

function wait(ms: number) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), ms);
  });
}

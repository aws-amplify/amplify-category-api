import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { type Output } from '@aws-sdk/client-cloudformation';
import { CognitoIdentityProviderClient as CognitoClient } from '@aws-sdk/client-cognito-identity-provider';
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import moment from 'moment';
import { ResourceConstants } from 'graphql-transformer-common';
import { CloudFormationClient } from '../CloudFormationClient';
import { S3Client } from '../S3Client';
import { cleanupStackAfterTest, deploy } from '../deployNestedStacks';
import {
  createUserPool,
  createUserPoolClient,
  configureAmplify,
  authenticateUser,
  signupUser,
  createIdentityPool,
  setIdentityPoolRoles,
} from '../cognitoUtils';
import { resolveTestRegion } from '../testSetup';
import { CognitoIdentity } from 'aws-sdk';
import { IAMHelper } from '../IAMHelper';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';
import { Auth } from 'aws-amplify';
import { default as STS } from 'aws-sdk/clients/sts';

const region = resolveTestRegion();

jest.setTimeout(2000000);

describe('@model with @auth - iam access', () => {
  // setup clients
  const cf = new CloudFormationClient(region);
  const customS3Client = new S3Client(region);
  const cognitoClient = new CognitoClient({ region: region });
  const cognitoIdentityClient = new CognitoIdentityClient({ apiVersion: '2014-06-30', region: region });
  const awsS3Client = new S3Client({ region: region });
  const iamHelper = new IAMHelper(region);
  const sts = new STS();

  // stack info
  const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
  const NAME_PREFIX = `AuthV2TransformerIAMTests-${BUILD_TIMESTAMP}`;
  const STACK_NAME_WITH_IAM_ACCESS = `${NAME_PREFIX}-Stack-WithIam`;
  const BUCKET_NAME_WITH_IAM_ACCESS = `${NAME_PREFIX}-WithIam`.toLowerCase();
  const STACK_NAME_WITHOUT_IAM_ACCESS = `${NAME_PREFIX}-Stack-WithoutIamAccess`;
  const BUCKET_NAME_WITHOUT_IAM_ACCESS = `${NAME_PREFIX}-WithoutIamAccess`.toLowerCase();
  const AUTH_ROLE_NAME = `${NAME_PREFIX}-authRole`;
  const UNAUTH_ROLE_NAME = `${NAME_PREFIX}-unauthRole`;
  const BASIC_ROLE_NAME = `${NAME_PREFIX}-basicRole`;
  const BASIC_ROLE_NAME_APPSYNC_POLICY = `${NAME_PREFIX}-appsync-data-policy`;
  let BASIC_ROLE_NAME_APPSYNC_POLICY_ARN: string;
  const LOCAL_FS_BUILD_DIR_WITH_IAM_ACCESS = '/tmp/authv2_transformer_iam_tests_with_iam_access/';
  const LOCAL_FS_BUILD_DIR_WITHOUT_IAM_ACCESS = '/tmp/authv2_transformer_iam_tests_without_iam_access/';
  const S3_ROOT_DIR_KEY = 'deployments';
  let USER_POOL_ID: string;
  let IDENTITY_POOL_ID: string;
  let GRAPHQL_ENDPOINT_WITH_IAM_ACCESS: string;
  let GRAPHQL_ENDPOINT_WITHOUT_IAM_ACCESS: string;
  let GRAPHQL_CLIENT_API_KEY_WITH_IAM_ACCESS: AWSAppSyncClient<any>;
  let GRAPHQL_CLIENT_AUTH_ROLE_WITH_IAM_ACCESS: AWSAppSyncClient<any>;
  let GRAPHQL_CLIENT_UNAUTH_ROLE_WITH_IAM_ACCESS: AWSAppSyncClient<any>;
  let GRAPHQL_CLIENT_BASIC_ROLE_WITH_IAM_ACCESS: AWSAppSyncClient<any>;
  let GRAPHQL_CLIENT_API_KEY_WITHOUT_IAM_ACCESS: AWSAppSyncClient<any>;
  let GRAPHQL_CLIENT_AUTH_ROLE_WITHOUT_IAM_ACCESS: AWSAppSyncClient<any>;
  let GRAPHQL_CLIENT_UNAUTH_ROLE_WITHOUT_IAM_ACCESS: AWSAppSyncClient<any>;
  let GRAPHQL_CLIENT_BASIC_ROLE_WITHOUT_IAM_ACCESS: AWSAppSyncClient<any>;

  const USERNAME = 'user@test.com';
  const TMP_PASSWORD = 'Password123!';
  const REAL_PASSWORD = 'Password1234!';

  const outputValueSelector = (key: string) => {
    return (outputs: Output[]) => {
      const output = outputs.find((o: Output) => o.OutputKey === key);
      return output ? output.OutputValue : null;
    };
  };

  beforeAll(async () => {
    const schema = `
      type PostPublicIAM @model
          @auth(rules: [
              { allow: public, provider: iam }
          ]) {
          id: ID!
          title: String
      }
      
      type PostPrivateIAM @model
          @auth(rules: [
              { allow: private, provider: iam }
          ]) {
          id: ID!
          title: String
      }
      
      type PostWithNoIAMProvider @model 
          @auth(rules: [
              { allow: public, provider: apiKey }
          ]) {
          id: ID!
          title: String
      }
      
      type PostWithNoAuthDirective @model {
          id: ID!
          title: String
      }
      `;

    await awsS3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME_WITH_IAM_ACCESS }));
    await awsS3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME_WITHOUT_IAM_ACCESS }));

    const userPoolResource = await createUserPool(cognitoClient, `${NAME_PREFIX}UserPool`);
    const userPoolId = userPoolResource.UserPool!.Id!;
    const userPoolClientResponse = await createUserPoolClient(cognitoClient, userPoolId, `${NAME_PREFIX}UserPool`);
    const userPoolClientId = userPoolClientResponse.UserPoolClient!.ClientId!;
    USER_POOL_ID = userPoolId;

    IDENTITY_POOL_ID = await createIdentityPool(cognitoIdentityClient, `${NAME_PREFIX}IdentityPool`, {
      providerName: `cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      clientId: userPoolClientId,
    });

    const roles = await iamHelper.createRoles(AUTH_ROLE_NAME, UNAUTH_ROLE_NAME, IDENTITY_POOL_ID);

    await setIdentityPoolRoles(cognitoIdentityClient, IDENTITY_POOL_ID, {
      authRoleArn: roles.authRole.Arn,
      unauthRoleArn: roles.unauthRole.Arn,
      providerName: `cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      clientId: userPoolClientId,
      useTokenAuth: true,
    });

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [{ authenticationType: 'API_KEY' }],
    };
    const outWithIamAccess = testTransform({
      schema,
      authConfig,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
      synthParameters: {
        enableIamAccess: true,
      },
    });
    const outWithoutIamAccess = testTransform({
      schema,
      authConfig,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
      synthParameters: {
        enableIamAccess: false,
      },
    });
    const [finishedStackWithIamAccess, finishedStackWithoutIamAccess] = await Promise.all([
      deploy(
        customS3Client,
        cf,
        STACK_NAME_WITH_IAM_ACCESS,
        outWithIamAccess,
        { authRoleName: AUTH_ROLE_NAME, unauthRoleName: UNAUTH_ROLE_NAME },
        LOCAL_FS_BUILD_DIR_WITH_IAM_ACCESS,
        BUCKET_NAME_WITH_IAM_ACCESS,
        S3_ROOT_DIR_KEY,
        BUILD_TIMESTAMP,
      ),
      deploy(
        customS3Client,
        cf,
        STACK_NAME_WITHOUT_IAM_ACCESS,
        outWithoutIamAccess,
        { authRoleName: AUTH_ROLE_NAME, unauthRoleName: UNAUTH_ROLE_NAME },
        LOCAL_FS_BUILD_DIR_WITHOUT_IAM_ACCESS,
        BUCKET_NAME_WITHOUT_IAM_ACCESS,
        S3_ROOT_DIR_KEY,
        BUILD_TIMESTAMP,
      ),
    ]);
    // Wait for any propagation to avoid random
    // "The security token included in the request is invalid" errors
    await new Promise<void>((res) => setTimeout(() => res(), 5000));

    expect(finishedStackWithIamAccess).toBeDefined();
    const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
    const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
    const getApiId = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIIdOutput);
    GRAPHQL_ENDPOINT_WITH_IAM_ACCESS = getApiEndpoint(finishedStackWithIamAccess.Outputs);
    const apiKeyWithIamAccess = getApiKey(finishedStackWithIamAccess.Outputs);
    GRAPHQL_ENDPOINT_WITHOUT_IAM_ACCESS = getApiEndpoint(finishedStackWithoutIamAccess.Outputs);
    const apiKeyWithoutIamAccess = getApiKey(finishedStackWithoutIamAccess.Outputs);

    // Verify we have all the details
    expect(apiKeyWithIamAccess).toBeTruthy();
    expect(apiKeyWithoutIamAccess).toBeTruthy();
    expect(GRAPHQL_ENDPOINT_WITH_IAM_ACCESS).toBeTruthy();
    expect(GRAPHQL_ENDPOINT_WITHOUT_IAM_ACCESS).toBeTruthy();
    expect(USER_POOL_ID).toBeTruthy();
    expect(userPoolClientId).toBeTruthy();

    // Create basic IAM role and grant access to APIs.
    const basicRole = await iamHelper.createRole(BASIC_ROLE_NAME);
    BASIC_ROLE_NAME_APPSYNC_POLICY_ARN = (
      await iamHelper.createAppSyncDataPolicy(BASIC_ROLE_NAME_APPSYNC_POLICY, region, [
        getApiId(finishedStackWithIamAccess.Outputs),
        getApiId(finishedStackWithoutIamAccess.Outputs),
      ])
    ).Policy.Arn;
    await iamHelper.attachPolicy(BASIC_ROLE_NAME_APPSYNC_POLICY_ARN, BASIC_ROLE_NAME);
    // Wait for any propagation to avoid random failures when we assume the role below.
    await new Promise<void>((res) => setTimeout(() => res(), 5000));

    configureAmplify(USER_POOL_ID, userPoolClientId, IDENTITY_POOL_ID);
    await signupUser(USER_POOL_ID, USERNAME, TMP_PASSWORD);
    await authenticateUser(USERNAME, TMP_PASSWORD, REAL_PASSWORD);
    await Auth.signIn(USERNAME, REAL_PASSWORD);
    const authCreds = await Auth.currentCredentials();
    await Auth.signOut();
    const unauthCreds = await Auth.currentCredentials();
    const basicRoleCreds = (
      await sts
        .assumeRole({
          RoleArn: basicRole.Arn,
          RoleSessionName: BUILD_TIMESTAMP,
          DurationSeconds: 3600,
        })
        .promise()
    ).Credentials;

    GRAPHQL_CLIENT_API_KEY_WITH_IAM_ACCESS = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT_WITH_IAM_ACCESS,
      region: region,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey: apiKeyWithIamAccess,
      },
      offlineConfig: {
        keyPrefix: 'apikey',
      },
      disableOffline: true,
    });
    GRAPHQL_CLIENT_API_KEY_WITHOUT_IAM_ACCESS = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT_WITHOUT_IAM_ACCESS,
      region: region,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey: apiKeyWithoutIamAccess,
      },
      offlineConfig: {
        keyPrefix: 'apikey',
      },
      disableOffline: true,
    });

    GRAPHQL_CLIENT_AUTH_ROLE_WITH_IAM_ACCESS = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT_WITH_IAM_ACCESS,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: authCreds.accessKeyId,
          secretAccessKey: authCreds.secretAccessKey,
          sessionToken: authCreds.sessionToken,
        },
      },
      disableOffline: true,
    });
    GRAPHQL_CLIENT_UNAUTH_ROLE_WITH_IAM_ACCESS = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT_WITH_IAM_ACCESS,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: unauthCreds.accessKeyId,
          secretAccessKey: unauthCreds.secretAccessKey,
          sessionToken: unauthCreds.sessionToken,
        },
      },
      disableOffline: true,
    });
    GRAPHQL_CLIENT_BASIC_ROLE_WITH_IAM_ACCESS = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT_WITH_IAM_ACCESS,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: basicRoleCreds.AccessKeyId,
          secretAccessKey: basicRoleCreds.SecretAccessKey,
          sessionToken: basicRoleCreds.SessionToken,
        },
      },
      disableOffline: true,
    });
    GRAPHQL_CLIENT_AUTH_ROLE_WITHOUT_IAM_ACCESS = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT_WITHOUT_IAM_ACCESS,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: authCreds.accessKeyId,
          secretAccessKey: authCreds.secretAccessKey,
          sessionToken: authCreds.sessionToken,
        },
      },
      disableOffline: true,
    });
    GRAPHQL_CLIENT_UNAUTH_ROLE_WITHOUT_IAM_ACCESS = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT_WITHOUT_IAM_ACCESS,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: unauthCreds.accessKeyId,
          secretAccessKey: unauthCreds.secretAccessKey,
          sessionToken: unauthCreds.sessionToken,
        },
      },
      disableOffline: true,
    });
    GRAPHQL_CLIENT_BASIC_ROLE_WITHOUT_IAM_ACCESS = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT_WITHOUT_IAM_ACCESS,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: basicRoleCreds.AccessKeyId,
          secretAccessKey: basicRoleCreds.SecretAccessKey,
          sessionToken: basicRoleCreds.SessionToken,
        },
      },
      disableOffline: true,
    });
  });

  afterAll(async () => {
    await Promise.all([
      cleanupStackAfterTest(BUCKET_NAME_WITHOUT_IAM_ACCESS, STACK_NAME_WITHOUT_IAM_ACCESS, cf),
      cleanupStackAfterTest(
        BUCKET_NAME_WITH_IAM_ACCESS,
        STACK_NAME_WITH_IAM_ACCESS,
        cf,
        { cognitoClient, userPoolId: USER_POOL_ID },
        { identityClient: cognitoIdentityClient, identityPoolId: IDENTITY_POOL_ID },
      ),
    ]);
    try {
      await iamHelper.deleteRole(AUTH_ROLE_NAME);
    } catch (e) {
      console.warn(`Error during auth role cleanup ${e}`);
    }
    try {
      await iamHelper.deleteRole(UNAUTH_ROLE_NAME);
    } catch (e) {
      console.warn(`Error during unauth role cleanup ${e}`);
    }
    try {
      await iamHelper.detachPolicy(BASIC_ROLE_NAME_APPSYNC_POLICY_ARN, BASIC_ROLE_NAME);
    } catch (e) {
      console.warn(`Error during detaching basic role policy ${e}`);
    }
    try {
      await iamHelper.deletePolicy(BASIC_ROLE_NAME_APPSYNC_POLICY_ARN);
    } catch (e) {
      console.warn(`Error during deleting basic role policy ${e}`);
    }
    try {
      await iamHelper.deleteRole(BASIC_ROLE_NAME);
    } catch (e) {
      console.warn(`Error during basic role cleanup ${e}`);
    }
  });

  it('can access PostPublicIAM', async () => {
    for (const graphqlClient of [
      GRAPHQL_CLIENT_UNAUTH_ROLE_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_UNAUTH_ROLE_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_BASIC_ROLE_WITH_IAM_ACCESS,
    ]) {
      await testHasCRUDLAccess(graphqlClient, 'PostPublicIAM');
    }
  });

  it('cannot access PostPublicIAM', async () => {
    for (const graphqlClient of [
      GRAPHQL_CLIENT_API_KEY_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_API_KEY_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_AUTH_ROLE_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_AUTH_ROLE_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_BASIC_ROLE_WITHOUT_IAM_ACCESS,
    ]) {
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'PostPublicIAM');
    }
  });

  it('can access PostPrivateIAM', async () => {
    for (const graphqlClient of [
      GRAPHQL_CLIENT_AUTH_ROLE_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_AUTH_ROLE_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_BASIC_ROLE_WITH_IAM_ACCESS,
    ]) {
      await testHasCRUDLAccess(graphqlClient, 'PostPrivateIAM');
    }
  });

  it('cannot access PostPrivateIAM', async () => {
    for (const graphqlClient of [
      GRAPHQL_CLIENT_API_KEY_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_API_KEY_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_UNAUTH_ROLE_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_UNAUTH_ROLE_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_BASIC_ROLE_WITHOUT_IAM_ACCESS,
    ]) {
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'PostPrivateIAM');
    }
  });

  it('can access PostWithNoIAMProviders', async () => {
    for (const graphqlClient of [
      GRAPHQL_CLIENT_BASIC_ROLE_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_API_KEY_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_API_KEY_WITHOUT_IAM_ACCESS,
    ]) {
      await testHasCRUDLAccess(graphqlClient, 'PostWithNoIAMProvider', 'PostWithNoIAMProviders');
    }
  });

  it('cannot access PostWithNoIAMProviders', async () => {
    for (const graphqlClient of [
      GRAPHQL_CLIENT_AUTH_ROLE_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_AUTH_ROLE_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_UNAUTH_ROLE_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_UNAUTH_ROLE_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_BASIC_ROLE_WITHOUT_IAM_ACCESS,
    ]) {
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'PostWithNoIAMProvider', 'PostWithNoIAMProviders');
    }
  });

  it('can access PostWithNoAuthDirective', async () => {
    for (const graphqlClient of [GRAPHQL_CLIENT_BASIC_ROLE_WITH_IAM_ACCESS]) {
      await testHasCRUDLAccess(graphqlClient, 'PostWithNoAuthDirective', 'PostWithNoAuthDirectives');
    }
  });

  it('cannot access PostWithNoAuthDirective', async () => {
    for (const graphqlClient of [
      GRAPHQL_CLIENT_AUTH_ROLE_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_AUTH_ROLE_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_UNAUTH_ROLE_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_UNAUTH_ROLE_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_BASIC_ROLE_WITHOUT_IAM_ACCESS,
      GRAPHQL_CLIENT_API_KEY_WITH_IAM_ACCESS,
      GRAPHQL_CLIENT_API_KEY_WITHOUT_IAM_ACCESS,
    ]) {
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'PostWithNoAuthDirective', 'PostWithNoAuthDirectives');
    }
  });
});

const testHasCRUDLAccess = async (graphqlClient: AWSAppSyncClient<any>, modelName: string, modelListName?: string): Promise<void> => {
  if (!modelListName) {
    modelListName = modelName;
  }
  const createResponse = (await graphqlClient.mutate({
    mutation: gql`
          mutation {
            create${modelName}(input: { title: "some title" }) {
              id
              title
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;
  expect(createResponse.data[`create${modelName}`].id).toBeTruthy();
  expect(createResponse.data[`create${modelName}`].title).toBeTruthy();

  const listResponse = (await graphqlClient.query({
    query: gql`
          query {
            list${modelListName} {
              items {
                id
                title
              }
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;
  expect(listResponse.data[`list${modelListName}`].items.length).toBeGreaterThan(0);

  const sampleItemId = createResponse.data[`create${modelName}`].id;
  const getResponse = (await graphqlClient.query({
    query: gql`
          query {
            get${modelName}(id: "${sampleItemId}") {
              id
              title
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;
  expect(getResponse.data[`get${modelName}`].id).toBeTruthy();
  expect(getResponse.data[`get${modelName}`].title).toBeTruthy();

  const updateResponse = (await graphqlClient.mutate({
    mutation: gql`
          mutation {
            update${modelName}(input: { id: "${sampleItemId}", title: "some updated title" }) {
              id
              title
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;
  expect(updateResponse.data[`update${modelName}`].id).toBeTruthy();
  expect(updateResponse.data[`update${modelName}`].title).toBeTruthy();

  const deleteResponse = (await graphqlClient.mutate({
    mutation: gql`
          mutation {
            delete${modelName}(input: { id: "${sampleItemId}" }) {
              id
              title
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;

  expect(deleteResponse.data[`delete${modelName}`].id).toBeTruthy();
  expect(deleteResponse.data[`delete${modelName}`].title).toBeTruthy();
};

const testDoesNotHaveCRUDLAccess = async (
  graphqlClient: AWSAppSyncClient<any>,
  modelName: string,
  modelListName?: string,
): Promise<void> => {
  if (!modelListName) {
    modelListName = modelName;
  }
  await expect(
    graphqlClient.mutate({
      mutation: gql`
          mutation {
            create${modelName}(input: { title: "some title" }) {
              id
              title
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Mutation|Network error: Response not successful: Received status code 401/,
  );

  await expect(
    graphqlClient.query({
      query: gql`
          query {
            list${modelListName} {
              items {
                id
                title
              }
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Query|Network error: Response not successful: Received status code 401/,
  );

  await expect(
    graphqlClient.query({
      query: gql`
          query {
            get${modelName}(id: "some-id") {
              id
              title
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Query|Network error: Response not successful: Received status code 401/,
  );

  await expect(
    graphqlClient.mutate({
      mutation: gql`
          mutation {
            update${modelName}(input: { id: "some-id", title: "some updated title" }) {
              id
              title
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Mutation|Network error: Response not successful: Received status code 401/,
  );

  await expect(
    graphqlClient.mutate({
      mutation: gql`
          mutation {
            delete${modelName}(input: { id: "some-id" }) {
              id
              title
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Mutation|Network error: Response not successful: Received status code 401/,
  );
};

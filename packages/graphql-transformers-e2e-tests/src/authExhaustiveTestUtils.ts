import {
  AuthProvider, AuthStrategy, AuthTransformer, ModelOperation,
} from '@aws-amplify/graphql-auth-transformer';
import {
  JWTToken,
} from 'amplify-appsync-simulator';
import { Auth } from 'aws-amplify';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { CognitoIdentity, S3 } from 'aws-sdk';
import { Output } from 'aws-sdk/clients/cloudformation';
import { default as CognitoClient } from 'aws-sdk/clients/cognitoidentityserviceprovider';
import * as crypto from 'crypto';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import gql from 'graphql-tag';
import { plurality, ResourceConstants } from 'graphql-transformer-common';
import { v4 } from 'uuid';
import { GraphQLTransform } from '@aws-amplify/graphql-transformer-core';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { CloudFormationClient } from './CloudFormationClient';
import {
  addUserToGroup, authenticateUser, configureAmplify, createGroup, createIdentityPool, createUserPool, createUserPoolClient, signupUser,
} from './cognitoUtils';
import { cleanupStackAfterTest, deploy } from './deployNestedStacks';
import { IAMHelper } from './IAMHelper';
import { S3Client } from './S3Client';

const REGION = 'us-west-2';
const IAM_HELPER = new IAMHelper(REGION);
const CF = new CloudFormationClient(REGION);
const COGNITO_CLIENT = new CognitoClient({ apiVersion: '2016-04-19', region: REGION });
const IDENTITY_CLIENT = new CognitoIdentity({ apiVersion: '2014-06-30', region: REGION });

const USERNAME1 = 'user1@test.com';
const TMP_PASSWORD = 'Password123!';
const REAL_PASSWORD = 'Password1234!';
const ADMIN_GROUP_NAME = 'Admin';

const S3_ROOT_DIR_KEY = 'deployments';

/**
 *
 */
export const outputValueSelector = (key: string): any => (outputs: Output[]) => {
  const output = outputs.find((o: Output) => o.OutputKey === key);
  return output ? output.OutputValue : null;
};

/**
 *
 */
export const createGraphQLClient = async (
  graphqlEndpoint: string,
  strategy: AuthStrategy,
  provider: AuthProvider,
  idToken: any,
  accessToken: any,
  apiKey: string,
  validAuth = true,
): Promise<AWSAppSyncClient<any>> => {
  switch (strategy) {
    case 'owner': {
      switch (provider) {
        case 'userPools': {
          return new AWSAppSyncClient({
            url: graphqlEndpoint,
            region: REGION,
            auth: {
              type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
              jwtToken: () => idToken,
            },
            disableOffline: true,
          });
        }
        case 'oidc': {
          return new AWSAppSyncClient({
            url: graphqlEndpoint,
            region: REGION,
            disableOffline: true,
            auth: {
              type: AUTH_TYPE.OPENID_CONNECT,
              jwtToken: idToken,
            },
          });
        }
        default:
          throw new Error(`'${provider}' auth provider not supported for this test`);
      }
    }
    case 'groups': {
      switch (provider) {
        case 'userPools': {
          return new AWSAppSyncClient({
            url: graphqlEndpoint,
            region: REGION,
            auth: {
              type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
              jwtToken: () => accessToken,
            },
            disableOffline: true,
          });
        }
        case 'oidc': {
          return new AWSAppSyncClient({
            url: graphqlEndpoint,
            region: REGION,
            disableOffline: true,
            auth: {
              type: AUTH_TYPE.OPENID_CONNECT,
              jwtToken: accessToken,
            },
          });
        }
        default:
          throw new Error(`'${provider}' auth provider not supported for this test`);
      }
    }
    case 'public': {
      switch (provider) {
        case 'apiKey': {
          return new AWSAppSyncClient({
            url: graphqlEndpoint,
            region: REGION,
            auth: {
              type: AUTH_TYPE.API_KEY,
              apiKey,
            },
            offlineConfig: {
              keyPrefix: 'apikey',
            },
            disableOffline: true,
          });
        }
        case 'iam': {
          await Auth.signOut();
          const unauthCreds = await Auth.currentCredentials();
          return new AWSAppSyncClient({
            url: graphqlEndpoint,
            region: REGION,
            auth: {
              type: AUTH_TYPE.AWS_IAM,
              credentials: validAuth ? {
                accessKeyId: unauthCreds.accessKeyId,
                secretAccessKey: unauthCreds.secretAccessKey,
                sessionToken: unauthCreds.sessionToken,
              } : {
                accessKeyId: '',
                secretAccessKey: '',
                sessionToken: '',
              },
            },
            disableOffline: true,
          });
        }
        default:
          throw new Error(`'${provider}' auth provider not supported for this test`);
      }
    }
    case 'private': {
      switch (provider) {
        case 'userPools': {
          return new AWSAppSyncClient({
            url: graphqlEndpoint,
            region: REGION,
            auth: {
              type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
              jwtToken: () => idToken,
            },
            offlineConfig: {
              keyPrefix: 'userPools',
            },
            disableOffline: true,
          });
        }
        case 'oidc': {
          return new AWSAppSyncClient({
            url: graphqlEndpoint,
            region: REGION,
            disableOffline: true,
            auth: {
              type: AUTH_TYPE.OPENID_CONNECT,
              jwtToken: idToken,
            },
          });
        }
        case 'iam': {
          await Auth.signIn(USERNAME1, REAL_PASSWORD);
          const authCreds = await Auth.currentCredentials();
          return new AWSAppSyncClient({
            url: graphqlEndpoint,
            region: REGION,
            auth: {
              type: AUTH_TYPE.AWS_IAM,
              credentials: validAuth ? {
                accessKeyId: authCreds.accessKeyId,
                secretAccessKey: authCreds.secretAccessKey,
                sessionToken: authCreds.sessionToken,
              } : {
                accessKeyId: '',
                secretAccessKey: '',
                sessionToken: '',
              },
            },
            disableOffline: true,
          });
        }
        default:
          throw new Error(`'${provider}' auth provider not supported for this test`);
      }
    }
    default:
      throw new Error(`'${strategy}' auth strategy not supported for this test`);
  }
};

/**
 *
 */
export const testAuthResolver = async (
  graphqlEndpoint: string,
  modelName: string,
  strategy: AuthStrategy,
  provider: AuthProvider,
  operation: ModelOperation,
  idToken: string,
  accessToken: string,
  apiKey: string,
  hasCustomPrimaryKey = false,
  hasPartialAccess = false,
): Promise<void> => {
  const client = await createGraphQLClient(
    graphqlEndpoint,
    strategy,
    provider,
    idToken,
    accessToken,
    apiKey,
  );
  const invalidClient = await createGraphQLClient(
    graphqlEndpoint,
    strategy,
    provider,
    getJWTToken('invalid-pool-id', 'invalid', 'invalid@test.com'),
    getJWTToken('invalid-pool-id', 'invalid', 'invalid@test.com'),
    'INVALID_API_KEY',
    false,
  );

  const createMutation = gql`
    mutation {
      create${modelName} (input: { profileId: "${v4()}", firstName: "Amplify", lastName: "CLI", title: "Test" }) {
        profileId
        firstName
        lastName
      }
    }
  `;

  const response = await client.mutate<any>({
    mutation: createMutation,
    fetchPolicy: 'no-cache',
  });
  expect(response.data[`create${modelName}`].profileId).toBeDefined();
  expect(response.errors).not.toBeDefined();

  try {
    const failResponse = await invalidClient.mutate<any>({
      mutation: createMutation,
      fetchPolicy: 'no-cache',
    });
    expect(failResponse.data[`create${modelName}`].profileId).not.toBeDefined();
    expect(failResponse.errors).toBeDefined();
  } catch (e) {
    expect(e).toBeDefined();
  }

  const { profileId } = response.data[`create${modelName}`];
  if (operation === 'read') {
    // get/list
    const listQuery = gql`
      query {
        list${plurality(modelName, true)} {
          items {
            lastName
            firstName
          }
        }
      }
    `;

    const listResponse = await client.query<any>({
      query: listQuery,
      fetchPolicy: 'no-cache',
    });

    expect(listResponse.errors).not.toBeDefined();

    try {
      const failListResponse = await invalidClient.query<any>({
        query: listQuery,
        fetchPolicy: 'no-cache',
      });
      expect(failListResponse.errors).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }

    const getInput = hasCustomPrimaryKey ? `profileId: "${profileId}", firstName: "Amplify", lastName: "CLI"` : `profileId: "${profileId}"`;

    const getQuery = gql`
      query {
        get${modelName} (${getInput}) {
          lastName
          firstName
        }
      }
    `;

    const getResponse = await client.query<any>({
      query: getQuery,
      fetchPolicy: 'no-cache',
    });

    expect(getResponse.errors).not.toBeDefined();

    try {
      const failGetResponse = await invalidClient.query<any>({
        query: getQuery,
        fetchPolicy: 'no-cache',
      });
      expect(failGetResponse.errors).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  } else if (operation === 'delete' || operation === 'update') {
    const input = operation === 'update'
      ? `{ profileId: "${profileId}", firstName: "Amplify", lastName: "CLI", title: "UPDATED" }`
      : operation === 'delete' && hasCustomPrimaryKey ? `{ profileId: "${profileId}", firstName: "Amplify", lastName: "CLI" }`
        : `{ profileId: "${profileId}" }`;
    const mutation = gql`
      mutation {
        ${operation}${modelName} (input: ${input}) {
          firstName
          lastName
        }
      }
    `;

    try {
      const response = await client.mutate<any>({
        mutation,
        fetchPolicy: 'no-cache',
      });

      if (hasPartialAccess && operation === 'delete') {
        expect(response.errors).toBeDefined();
      } else {
        expect(response.errors).not.toBeDefined();
      }
    } catch (e) {
      expect(hasPartialAccess && operation === 'delete').toBeTruthy();
    }

    try {
      const failResponse = await invalidClient.mutate<any>({
        mutation,
        fetchPolicy: 'no-cache',
      });
      expect(failResponse.errors).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  }
};

/**
 *
 */
export const generateTestModel = (
  authStrategy: AuthStrategy,
  authProvider: AuthProvider,
  operation: ModelOperation,
  hasPartialAccess = false,
  hasCustomPrimaryKey = false,
): { modelName: string, schema: string } => {
  const authRuleDirective = generateAuthDirective(authStrategy, authProvider, operation);
  const authRuleDirectiveNoOps = generateAuthDirective(authStrategy, authProvider, operation !== 'create' ? 'create' : undefined);
  const hash = crypto.createHash('sha256').update(authStrategy + authProvider + operation + hasCustomPrimaryKey + hasPartialAccess).digest('hex').slice(0, 8);
  const modelName = `Profile${hash}`;
  const schema = `
    type ${modelName} @model ${authRuleDirective} {
      profileId: ID! ${hasCustomPrimaryKey ? '@primaryKey(sortKeyFields: ["firstName", "lastName"])' : '@primaryKey'}
      firstName: String!
      lastName: String!
      title: String
      ${authStrategy === 'groups' ? 'groups: [String]' : ''}
      ${hasPartialAccess ? `noAccessField: String ${authRuleDirectiveNoOps}` : ''}
    }`;

  return { modelName, schema };
};

/**
 *
 */
export const generateAuthConfig = (
  region: string,
  userPoolId: string,
  userPoolClientId: string,
): AppSyncAuthConfiguration => ({
  defaultAuthentication: {
    authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  },
  additionalAuthenticationProviders: [
    { authenticationType: 'AWS_IAM' },
    { authenticationType: 'API_KEY' },
    {
      authenticationType: 'OPENID_CONNECT',
      openIDConnectConfig: {
        name: 'awscognitouserpool',
        issuerUrl: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/`,
        clientId: userPoolClientId,
      },
    },
    {
      authenticationType: 'AWS_LAMBDA',
      lambdaAuthorizerConfig: {
        lambdaFunction: 'authorize',
        ttlSeconds: 600,
      },
    },
  ],
});

/**
 *
 */
export const deploySchema = async (
  schema: string,
  stackName: string,
  bucketName: string,
  authRoleName: string,
  unauthRoleName: string,
  buildDir: string,
  buildTimestamp: string,
) => {
  jest.setTimeout(1000 * 60 * 30);

  try {
    const awsS3Client = new S3({ region: REGION });
    await awsS3Client.createBucket({ Bucket: bucketName }).promise();
  } catch (e) {
    // fail early if we can't create the bucket
    expect(e).not.toBeDefined();
  }

  const userPoolResource = await createUserPool(COGNITO_CLIENT, `UserPool${stackName}`);
  const userPoolId = userPoolResource.UserPool.Id;
  const userPoolClientResponse = await createUserPoolClient(COGNITO_CLIENT, userPoolId, `UserPool${stackName}`);
  const userPoolClientId = userPoolClientResponse.UserPoolClient.ClientId;

  const roles = await IAM_HELPER.createRoles(authRoleName, unauthRoleName);
  const identityPoolId = await createIdentityPool(IDENTITY_CLIENT, `IdentityPool${stackName}`, {
    authRoleArn: roles.authRole.Arn,
    unauthRoleArn: roles.unauthRole.Arn,
    providerName: `cognito-idp.${REGION}.amazonaws.com/${userPoolId}`,
    clientId: userPoolClientId,
    useTokenAuth: true,
  });

  const authConfig: AppSyncAuthConfiguration = generateAuthConfig(REGION, userPoolId, userPoolClientId);
  const transformer = new GraphQLTransform({
    authConfig,
    featureFlags: {
      getBoolean: jest.fn().mockImplementation((name, defaultValue) => {
        if (name === 'secondaryKeyAsGSI') {
          return true;
        }
        if (name === 'useSubUsernameForDefaultIdentityClaim') {
          return true;
        }
        return defaultValue;
      }),
      getNumber: jest.fn(),
      getObject: jest.fn(),
      getString: jest.fn(),
    },
    transformers: [
      new ModelTransformer(),
      new PrimaryKeyTransformer(),
      new AuthTransformer({ identityPoolId }),
    ],
  });

  const out = transformer.transform(schema);
  const customS3Client = new S3Client(REGION);

  const finishedStack = await deploy(
    customS3Client,
    CF,
    stackName,
    out,
    { AuthCognitoUserPoolId: userPoolId, authRoleName: roles.authRole.RoleName, unauthRoleName: roles.unauthRole.RoleName },
    buildDir,
    bucketName,
    S3_ROOT_DIR_KEY,
    buildTimestamp,
  );

  // Wait for any propagation to avoid random
  // "The security token included in the request is invalid" errors
  await new Promise<void>(res => setTimeout(() => res(), 5000));

  expect(finishedStack).toBeDefined();
  const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
  const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
  const graphqlEndpoint = getApiEndpoint(finishedStack.Outputs);

  const apiKey = getApiKey(finishedStack.Outputs);
  expect(apiKey).toBeTruthy();

  // Verify we have all the details
  expect(graphqlEndpoint).toBeTruthy();

  expect(userPoolId).toBeTruthy();
  expect(userPoolClientId).toBeTruthy();

  // Configure Amplify, create users, and sign in
  configureAmplify(userPoolId, userPoolClientId, identityPoolId);

  await signupUser(userPoolId, USERNAME1, TMP_PASSWORD);
  await createGroup(userPoolId, ADMIN_GROUP_NAME);
  await addUserToGroup(ADMIN_GROUP_NAME, USERNAME1, userPoolId);

  const authResAfterGroup: any = await authenticateUser(USERNAME1, TMP_PASSWORD, REAL_PASSWORD);
  const idToken = authResAfterGroup.getIdToken().getJwtToken();
  const accessToken = authResAfterGroup.getAccessToken().getJwtToken();

  return {
    idToken,
    accessToken,
    apiKey,
    graphqlEndpoint,
    userPoolId,
    identityPoolId,
  };
};

/**
 *
 */
export const cleanupAuthExhaustiveTest = async (
  stackName: string,
  bucketName: string,
  authRoleName: string,
  unauthRoleName: string,
  userPoolId: string,
  identityPoolId: string,
): Promise<void> => {
  await cleanupStackAfterTest(
    bucketName,
    stackName,
    CF,
    { cognitoClient: COGNITO_CLIENT, userPoolId },
    { identityClient: IDENTITY_CLIENT, identityPoolId },
  );
  try {
    await IAM_HELPER.deleteRole(authRoleName);
  } catch (e) {
    console.warn(`Error during auth role cleanup ${e}`);
  }
  try {
    await IAM_HELPER.deleteRole(unauthRoleName);
  } catch (e) {
    console.warn(`Error during unauth role cleanup ${e}`);
  }
};

/**
 *
 */
export const getJWTToken = (
  userPool: string,
  username: string,
  email: string,
  groups: string[] = [],
  tokenType: 'id' | 'access' = 'id',
): JWTToken => {
  const token: JWTToken = {
    iss: `https://cognito-idp.us-west-2.amazonaws.com/us-west-2_${userPool}`,
    sub: v4(),
    aud: '75pk49boud2olipfda0ke3snic',
    exp: Math.floor(Date.now() / 1000) + 10000,
    iat: Math.floor(Date.now() / 1000),
    event_id: v4(),
    token_use: tokenType,
    auth_time: Math.floor(Date.now() / 1000),
    'cognito:username': username,
    'cognito:groups': groups,
    email,
  };
  return token;
};

/**
 *
 */
export const generateAuthDirective = (
  authStrategy: AuthStrategy,
  authProvider: AuthProvider,
  operation?: ModelOperation,
): string => `@auth (
  rules: [
    {
      allow: ${authStrategy},
      operations: [${operation ?? ''} ${operation && operation !== 'create' ? ', create' : ''}],
      provider: ${authProvider},
      ${authStrategy === 'groups' ? `groups: ["${ADMIN_GROUP_NAME}"],` : ''}
      ${authStrategy === 'groups' && authProvider === 'oidc' ? 'groupClaim: "cognito:groups",' : ''}
      ${authStrategy === 'owner' && authProvider === 'oidc' ? 'identityClaim: "sub",' : ''}
    },
  ]
)`;

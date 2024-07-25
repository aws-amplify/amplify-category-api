import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ResourceConstants } from 'graphql-transformer-common';
import { Output } from 'aws-sdk/clients/cloudformation';
import { S3, CognitoIdentityServiceProvider as CognitoClient } from 'aws-sdk';
import { default as moment } from 'moment';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';
import { CloudFormationClient } from '../CloudFormationClient';
import { cleanupStackAfterTest, deploy } from '../deployNestedStacks';
import { S3Client } from '../S3Client';
import { authenticateUser, configureAmplify, createUserPool, createUserPoolClient, signupUser } from '../cognitoUtils';
// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

import { resolveTestRegion } from '../testSetup';

const region = resolveTestRegion();

jest.setTimeout(2000000);

const cf = new CloudFormationClient(region);
const customS3Client = new S3Client(region);
const awsS3Client = new S3({ region: region });
const cognitoClient = new CognitoClient({ apiVersion: '2016-04-19', region: region });
const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const STACK_NAME = `RelationalOwnerAuthTransformersTest-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `appsync-relational-owner-auth-transformer-test-${BUILD_TIMESTAMP}`;
const LOCAL_FS_BUILD_DIR = '/tmp/relational_owner_auth_transformer_tests/';
const S3_ROOT_DIR_KEY = 'deployments';

let GRAPHQL_ENDPOINT: string;

let USER_POOL_AUTH_CLIENT_1: AWSAppSyncClient<any>;
let USER_POOL_AUTH_CLIENT_2: AWSAppSyncClient<any>;

let USER_POOL_ID: string;

const USERNAME1 = 'user1@test.com';
const USERNAME2 = 'user2@test.com';
const TMP_PASSWORD = 'Password123!';
const REAL_PASSWORD = 'Password1234!';

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

beforeAll(async () => {
  const validSchema = `
    type User @model 
    @auth(rules: [
      {allow: owner, ownerField: "userID"}, 
      {allow: private, operations: [get]}
    ]) {
      userID: String!@primaryKey
      displayName: String
      firstname: String @auth(rules: [{allow: owner, ownerField: "userID"}])
      lastname: String @auth(rules: [{allow: owner, ownerField: "userID"}])
      birth: AWSDate @auth(rules: [{allow: owner, ownerField: "userID"}])
      creditCards: [CreditCard!] @hasMany(fields: ["userID"])
    }

    type CreditCard @model 
    @auth(rules:[{allow: owner, ownerField: "userID"}]) 
    {
      userID: String! @primaryKey(sortKeyFields: ["number","expMonth","expYear"])
      number: String!
      expMonth: String!
      expYear: String!
      name: String
      issuer: String
    }
  `;
  let out;
  try {
    const modelTransformer = new ModelTransformer();
    const hasManyTransformer = new HasManyTransformer();
    const authTransformer = new AuthTransformer();
    const primaryKeyTransformer = new PrimaryKeyTransformer();
    out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      },
      transformers: [modelTransformer, primaryKeyTransformer, hasManyTransformer, authTransformer],
    });
  } catch (e) {
    console.error(`Failed to transform schema: ${e}`);
    expect(true).toEqual(false);
  }
  try {
    await awsS3Client
      .createBucket({
        Bucket: BUCKET_NAME,
      })
      .promise();
  } catch (e) {
    console.error(`Failed to create S3 bucket: ${e}`);
    expect(true).toEqual(false);
  }
  const userPoolResponse = await createUserPool(cognitoClient, `UserPool${STACK_NAME}`);
  USER_POOL_ID = userPoolResponse.UserPool?.Id!;
  const userPoolClientResponse = await createUserPoolClient(cognitoClient, USER_POOL_ID, `UserPool${STACK_NAME}`);
  const userPoolClientId = userPoolClientResponse.UserPoolClient?.ClientId!;
  try {
    const finishedStack = await deploy(
      customS3Client,
      cf,
      STACK_NAME,
      out,
      { AuthCognitoUserPoolId: USER_POOL_ID },
      LOCAL_FS_BUILD_DIR,
      BUCKET_NAME,
      S3_ROOT_DIR_KEY,
      BUILD_TIMESTAMP,
    );
    expect(finishedStack).toBeDefined();
    const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
    const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
    const apiKey = getApiKey(finishedStack.Outputs!);
    GRAPHQL_ENDPOINT = getApiEndpoint(finishedStack.Outputs!)!;
    expect(apiKey).not.toBeTruthy();

    // Verify we have all the details
    expect(GRAPHQL_ENDPOINT).toBeTruthy();
    expect(USER_POOL_ID).toBeTruthy();
    expect(userPoolClientId).toBeTruthy();

    // Configure Amplify, create users, and sign in.
    configureAmplify(USER_POOL_ID, userPoolClientId);
    await signupUser(USER_POOL_ID, USERNAME1, TMP_PASSWORD);
    const authRes1 = await authenticateUser(USERNAME1, TMP_PASSWORD, REAL_PASSWORD);
    const idToken1 = authRes1.getIdToken().getJwtToken();
    USER_POOL_AUTH_CLIENT_1 = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT,
      region,
      auth: {
        type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
        jwtToken: () => idToken1,
      },
      disableOffline: true,
    });
    await signupUser(USER_POOL_ID, USERNAME2, TMP_PASSWORD);
    const authRes2 = await authenticateUser(USERNAME2, TMP_PASSWORD, REAL_PASSWORD);
    const idToken2 = authRes2.getIdToken().getJwtToken();
    USER_POOL_AUTH_CLIENT_2 = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT,
      region,
      auth: {
        type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
        jwtToken: () => idToken2,
      },
      disableOffline: true,
    });
  } catch (e) {
    console.error(e);
    expect(true).toEqual(false);
  }
});

afterAll(async () => {
  await cleanupStackAfterTest(BUCKET_NAME, STACK_NAME, cf, { cognitoClient, userPoolId: USER_POOL_ID });
});

/**
 * Test queries below
 */
test('user2 should not access user1 restricted fields when query including relational fields', async () => {
  const createUser1Mutation = gql`
    mutation {
      createUser(input: { userID:"${USERNAME1}", displayName:"d1", firstname: "f1", lastname: "l1", birth: "2023-04-07" }) {
          userID
      }
    }
  `;
  const createUser1 = await USER_POOL_AUTH_CLIENT_1.mutate<any>({
    mutation: createUser1Mutation,
    fetchPolicy: 'no-cache',
  });
  expect(createUser1.data.createUser.userID).toEqual(USERNAME1);

  const createCreditCard1 = await USER_POOL_AUTH_CLIENT_1.mutate<any>({
    mutation: gql`
      mutation {
        createCreditCard(input: { userID:"${USERNAME1}", number:"10000", expMonth: "07", expYear: "2027", name: "platimum", issuer: "amex" }) {
            userID
        }
      }
    `,
    fetchPolicy: 'no-cache',
  });
  expect(createCreditCard1.data.createCreditCard.userID).toEqual(USERNAME1);

  const getUserQueryWithCreditCard = gql`
    query ($userID: String!) {
      getUser(userID: $userID) {
        creditCards {
          items {
            number
            name
            issuer
            userID
            expYear
            expMonth
          }
        }
        firstname
        lastname
        birth
        displayName
        userID
      }
    }
  `;
  const getResponse = await USER_POOL_AUTH_CLIENT_1.query<any>({
    query: getUserQueryWithCreditCard,
    variables: {
      userID: USERNAME1,
    },
  });
  expect(getResponse.data.getUser.creditCards.items[0].number).toEqual('10000');
  expect(getResponse.data.getUser.creditCards.items[0].name).toEqual('platimum');
  expect(getResponse.data.getUser.creditCards.items[0].issuer).toEqual('amex');
  expect(getResponse.data.getUser.creditCards.items[0].userID).toEqual(USERNAME1);
  expect(getResponse.data.getUser.creditCards.items[0].expYear).toEqual('2027');
  expect(getResponse.data.getUser.creditCards.items[0].expMonth).toEqual('07');

  expect(getResponse.data.getUser.firstname).toEqual('f1');
  expect(getResponse.data.getUser.lastname).toEqual('l1');
  expect(getResponse.data.getUser.birth).toEqual('2023-04-07');
  expect(getResponse.data.getUser.displayName).toEqual('d1');
  expect(getResponse.data.getUser.userID).toEqual(USERNAME1);
  // Run query with user2 login and use user1 as parameter
  await expect(
    USER_POOL_AUTH_CLIENT_2.query<any>({
      query: getUserQueryWithCreditCard,
      variables: {
        userID: USERNAME1,
      },
    }),
  ).rejects.toThrow('GraphQL error: Not Authorized to access');
});

import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ResourceConstants } from 'graphql-transformer-common';
import { type Output } from '@aws-sdk/client-cloudformation';
import { CognitoIdentityProviderClient as CognitoClient } from '@aws-sdk/client-cognito-identity-provider';
import { S3Client as AWSS3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import { default as moment } from 'moment';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';
import { CloudFormationClient } from '../CloudFormationClient';
import { cleanupStackAfterTest, deploy } from '../deployNestedStacks';
import { S3Client } from '../S3Client';
import {
  addUserToGroup,
  authenticateUser,
  configureAmplify,
  createGroup,
  createUserPool,
  createUserPoolClient,
  signupUser,
} from '../cognitoUtils';
// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

import { resolveTestRegion } from '../testSetup';

const region = resolveTestRegion();

const cf = new CloudFormationClient(region);
const customS3Client = new S3Client(region);
const awsS3Client = new AWSS3Client({ region: region });
const cognitoClient = new CognitoClient({ region: region });
const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const STACK_NAME = `IndexWithClaimFieldAsSortKeyAuthTest-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `appsync-index-with-claim-field-as-sk-test-${BUILD_TIMESTAMP}`;
const LOCAL_FS_BUILD_DIR = '/tmp/index_sortkey_auth_transformer_tests/';
const S3_ROOT_DIR_KEY = 'deployments';

let GRAPHQL_ENDPOINT: string;

let USER_POOL_AUTH_CLIENT_1: AWSAppSyncClient<any>;
let USER_POOL_AUTH_CLIENT_2: AWSAppSyncClient<any>;

let USER_POOL_ID: string;

let USER_1_SUB: string;
let USER_2_SUB: string;

const USERNAME1 = 'user1@test.com';
const USERNAME2 = 'user2@test.com';
const TMP_PASSWORD = 'Password123!';
const REAL_PASSWORD = 'Password1234!';

const ADMIN_GROUP_NAME = 'Admin';
const DEVS_GROUP_NAME = 'Devs';

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

beforeAll(async () => {
  const validSchema = `
    type Note1 @model
    @auth(rules: [{ allow: owner }]) 
    {  
      noteId: String! @primaryKey
      noteType: String! @index(name: "notesByNoteType", queryField:"note1sByNoteTypeAndOwner", sortKeyFields:["owner"])  
      owner: String
    }
    type Note2 @model
    @auth(rules: [{ allow: owner, identityClaim: "username" }]) 
    {  
      noteId: String! @primaryKey
      noteType: String! @index(name: "notesByNoteType", queryField:"note2sByNoteTypeAndOwner", sortKeyFields:["owner"])  
      owner: String
    } 
    type Note3 @model
    @auth(rules: [{ allow: groups, groupsField: "group" }])
    {
      noteId: String! @primaryKey
      noteType: String! @index(name: "notesByNoteType", queryField:"note3sByNoteTypeAndGroup", sortKeyFields:["group"])  
      group: String
    }
  `;
  let out;
  try {
    const modelTransformer = new ModelTransformer();
    const indexTransformer = new IndexTransformer();
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
      transformers: [modelTransformer, primaryKeyTransformer, indexTransformer, authTransformer],
    });
  } catch (e) {
    console.error(`Failed to transform schema: ${e}`);
    expect(true).toEqual(false);
  }
  try {
    await awsS3Client.send(
      new CreateBucketCommand({
        Bucket: BUCKET_NAME,
      }),
    );
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
    // Configure Amplify
    configureAmplify(USER_POOL_ID, userPoolClientId);
    // Create groups
    await createGroup(USER_POOL_ID, ADMIN_GROUP_NAME);
    await createGroup(USER_POOL_ID, DEVS_GROUP_NAME);
    // Sign up users, and sign in.
    await signupUser(USER_POOL_ID, USERNAME1, TMP_PASSWORD);
    await addUserToGroup(ADMIN_GROUP_NAME, USERNAME1, USER_POOL_ID);
    const authRes1 = await authenticateUser(USERNAME1, TMP_PASSWORD, REAL_PASSWORD);
    const idToken1 = authRes1.getIdToken().getJwtToken();
    USER_1_SUB = authRes1.idToken.payload.sub;
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
    await addUserToGroup(DEVS_GROUP_NAME, USERNAME2, USER_POOL_ID);
    const authRes2 = await authenticateUser(USERNAME2, TMP_PASSWORD, REAL_PASSWORD);
    const idToken2 = authRes2.getIdToken().getJwtToken();
    USER_2_SUB = authRes2.idToken.payload.sub;
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

test('when identity claim is sub::username, user1 should not access user2 records when logging in with user1 and querying with GSI', async () => {
  await createNote1(USER_POOL_AUTH_CLIENT_1, { noteId: 'i1-u1', noteType: 't1' });
  await createNote1(USER_POOL_AUTH_CLIENT_1, { noteId: 'i2-u1', noteType: 't1' });
  await createNote1(USER_POOL_AUTH_CLIENT_1, { noteId: 'i3-u1', noteType: 't1' });
  await createNote1(USER_POOL_AUTH_CLIENT_2, { noteId: 'i1-u2', noteType: 't1' });

  let resultItems;
  // query without sk
  const note1IndexQueryResponse = await note1ByNoteTypeAndOwner(USER_POOL_AUTH_CLIENT_1, { noteType: 't1' });
  resultItems = note1IndexQueryResponse.data.note1sByNoteTypeAndOwner.items;
  expect(resultItems).toBeDefined();
  expect(resultItems.filter((item) => item.owner === USERNAME1).length).toBe(3);
  expect(resultItems.filter((item) => item.owner === USERNAME2).length).toBe(0);
  // query with sk
  const note1IndexQueryWithSortKeyResponse = await note1ByNoteTypeAndOwner(USER_POOL_AUTH_CLIENT_1, {
    noteType: 't1',
    owner: { eq: `${USER_1_SUB}::${USERNAME1}` },
  });
  resultItems = note1IndexQueryWithSortKeyResponse.data.note1sByNoteTypeAndOwner.items;
  expect(resultItems).toBeDefined();
  expect(resultItems.filter((item) => item.owner === USERNAME1).length).toBe(3);
  expect(resultItems.filter((item) => item.owner === USERNAME2).length).toBe(0);
});

test('when identity claim is username, user1 should not access user2 records when logging in with user1 and querying with GSI', async () => {
  await createNote2(USER_POOL_AUTH_CLIENT_1, { noteId: 'i1-u1', noteType: 't1', owner: USERNAME1 });
  await createNote2(USER_POOL_AUTH_CLIENT_1, { noteId: 'i2-u1', noteType: 't1', owner: USERNAME1 });
  await createNote2(USER_POOL_AUTH_CLIENT_1, { noteId: 'i3-u1', noteType: 't1', owner: USERNAME1 });
  await createNote2(USER_POOL_AUTH_CLIENT_2, { noteId: 'i1-u2', noteType: 't1', owner: USERNAME2 });

  let resultItems;
  const note2IndexQueryResponse = await note2ByNoteTypeAndOwner(USER_POOL_AUTH_CLIENT_1, { noteType: 't1' });
  resultItems = note2IndexQueryResponse.data.note2sByNoteTypeAndOwner.items;
  expect(resultItems).toBeDefined();
  expect(resultItems.filter((item) => item.owner === USERNAME1).length).toBe(3);
  expect(resultItems.filter((item) => item.owner === USERNAME2).length).toBe(0);
  const note2IndexQueryWithSortKeyResponse = await note2ByNoteTypeAndOwner(USER_POOL_AUTH_CLIENT_1, {
    noteType: 't1',
    owner: { eq: USERNAME1 },
  });
  resultItems = note2IndexQueryWithSortKeyResponse.data.note2sByNoteTypeAndOwner.items;
  expect(resultItems).toBeDefined();
  expect(resultItems.filter((item) => item.owner === USERNAME1).length).toBe(3);
  expect(resultItems.filter((item) => item.owner === USERNAME2).length).toBe(0);
});

test('when dynamic group auth is applied, user1 should not access user2 records when logging in with user1 and querying with GSI', async () => {
  await createNote3(USER_POOL_AUTH_CLIENT_1, { noteId: 'i1-u1', noteType: 't1', group: ADMIN_GROUP_NAME });
  await createNote3(USER_POOL_AUTH_CLIENT_1, { noteId: 'i2-u1', noteType: 't1', group: ADMIN_GROUP_NAME });
  await createNote3(USER_POOL_AUTH_CLIENT_1, { noteId: 'i3-u1', noteType: 't1', group: ADMIN_GROUP_NAME });
  await createNote3(USER_POOL_AUTH_CLIENT_2, { noteId: 'i1-u2', noteType: 't1', group: DEVS_GROUP_NAME });

  let resultItems;
  const note3IndexQueryResponse = await note3ByNoteTypeAndGroup(USER_POOL_AUTH_CLIENT_1, { noteType: 't1' });
  resultItems = note3IndexQueryResponse.data.note3sByNoteTypeAndGroup.items;
  expect(resultItems).toBeDefined();
  expect(resultItems.filter((item) => item.group === ADMIN_GROUP_NAME).length).toBe(3);
  expect(resultItems.filter((item) => item.group === DEVS_GROUP_NAME).length).toBe(0);
  const note3IndexQueryWithSortKeyResponse = await note3ByNoteTypeAndGroup(USER_POOL_AUTH_CLIENT_1, {
    noteType: 't1',
    group: { eq: ADMIN_GROUP_NAME },
  });
  resultItems = note3IndexQueryWithSortKeyResponse.data.note3sByNoteTypeAndGroup.items;
  expect(resultItems).toBeDefined();
  expect(resultItems.filter((item) => item.group === ADMIN_GROUP_NAME).length).toBe(3);
  expect(resultItems.filter((item) => item.group === DEVS_GROUP_NAME).length).toBe(0);
});

/**
 * Helper function
 */
const createNote1 = async (client: AWSAppSyncClient<any>, variables: { noteId: string; noteType: string }): Promise<any> => {
  const result = await client.mutate<any>({
    mutation: gql`
      mutation CreateNote1($input: CreateNote1Input!) {
        createNote1(input: $input) {
          noteId
          noteType
          owner
        }
      }
    `,
    variables: {
      input: variables,
    },
    fetchPolicy: 'no-cache',
  });
  return result;
};
const createNote2 = async (client: AWSAppSyncClient<any>, variables: { noteId: string; noteType: string; owner: string }): Promise<any> => {
  const result = await client.mutate<any>({
    mutation: gql`
      mutation CreateNote2($input: CreateNote2Input!) {
        createNote2(input: $input) {
          noteId
          noteType
          owner
        }
      }
    `,
    variables: {
      input: variables,
    },
    fetchPolicy: 'no-cache',
  });
  return result;
};
const createNote3 = async (client: AWSAppSyncClient<any>, variables: { noteId: string; noteType: string; group: string }): Promise<any> => {
  const result = await client.mutate<any>({
    mutation: gql`
      mutation CreateNote3($input: CreateNote3Input!) {
        createNote3(input: $input) {
          noteId
          noteType
          group
        }
      }
    `,
    variables: {
      input: variables,
    },
    fetchPolicy: 'no-cache',
  });
  return result;
};
const note1ByNoteTypeAndOwner = async (
  client: AWSAppSyncClient<any>,
  variables: { noteType: string; owner?: { eq?: string } },
): Promise<any> => {
  const result = await client.query<any>({
    query: gql`
      query Note1ByNoteTypeAndOwner($noteType: String!, $owner: ModelStringKeyConditionInput) {
        note1sByNoteTypeAndOwner(noteType: $noteType, owner: $owner) {
          items {
            noteId
            noteType
            owner
          }
        }
      }
    `,
    variables,
  });
  return result;
};
const note2ByNoteTypeAndOwner = async (
  client: AWSAppSyncClient<any>,
  variables: { noteType: string; owner?: { eq?: string } },
): Promise<any> => {
  const result = await client.query<any>({
    query: gql`
      query Note2ByNoteTypeAndOwner($noteType: String!, $owner: ModelStringKeyConditionInput) {
        note2sByNoteTypeAndOwner(noteType: $noteType, owner: $owner) {
          items {
            noteId
            noteType
            owner
          }
        }
      }
    `,
    variables,
  });
  return result;
};
const note3ByNoteTypeAndGroup = async (
  client: AWSAppSyncClient<any>,
  variables: { noteType: string; group?: { eq?: string } },
): Promise<any> => {
  const result = await client.query<any>({
    query: gql`
      query Note3ByNoteTypeAndGroup($noteType: String!, $group: ModelStringKeyConditionInput) {
        note3sByNoteTypeAndGroup(noteType: $noteType, group: $group) {
          items {
            noteId
            noteType
            group
          }
        }
      }
    `,
    variables,
  });
  return result;
};

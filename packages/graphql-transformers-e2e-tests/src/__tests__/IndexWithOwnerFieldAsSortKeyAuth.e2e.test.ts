import { IndexTransformer, PrimaryKeyTransformer } from "@aws-amplify/graphql-index-transformer";
import { ModelTransformer } from "@aws-amplify/graphql-model-transformer";
import { AuthTransformer } from "@aws-amplify/graphql-auth-transformer";
import { GraphQLTransform } from "@aws-amplify/graphql-transformer-core";
import { ResourceConstants } from "graphql-transformer-common";
import { CloudFormationClient } from "../CloudFormationClient";
import { Output } from "aws-sdk/clients/cloudformation";
import { cleanupStackAfterTest, deploy } from "../deployNestedStacks";
import { S3Client } from "../S3Client";
import { S3, CognitoIdentityServiceProvider as CognitoClient } from "aws-sdk";
import { default as moment } from "moment";
import { authenticateUser, configureAmplify, createUserPool, createUserPoolClient, signupUser } from "../cognitoUtils";
// to deal with bug in cognito-identity-js
(global as any).fetch = require("node-fetch");
import { resolveTestRegion } from "../testSetup";
import AWSAppSyncClient, { AUTH_TYPE } from "aws-appsync";
import gql from "graphql-tag";

const region = resolveTestRegion();

jest.setTimeout(2000000);

const cf = new CloudFormationClient(region);
const customS3Client = new S3Client(region);
const awsS3Client = new S3({ region: region });
const cognitoClient = new CognitoClient({ apiVersion: "2016-04-19", region: region });
const BUILD_TIMESTAMP = moment().format("YYYYMMDDHHmmss");
const STACK_NAME = `IndexWithOwnerFieldAsSortKeyAuthTest-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `appsync-index-with-owner-field-as-sk-test-${BUILD_TIMESTAMP}`;
const LOCAL_FS_BUILD_DIR = "/tmp/index_owner_auth_transformer_tests/";
const S3_ROOT_DIR_KEY = "deployments";

let GRAPHQL_ENDPOINT: string;

let USER_POOL_AUTH_CLIENT_1: AWSAppSyncClient<any>;
let USER_POOL_AUTH_CLIENT_2: AWSAppSyncClient<any>;

let USER_POOL_ID: string;

const USERNAME1 = "user1@test.com";
const USERNAME2 = "user2@test.com";
const TMP_PASSWORD = "Password123!";
const REAL_PASSWORD = "Password1234!";

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
  `;
  let out;
  try {
    const modelTransformer = new ModelTransformer();
    const indexTransformer = new IndexTransformer();
    const authTransformer = new AuthTransformer();
    const primaryKeyTransformer = new PrimaryKeyTransformer();
    const transformer = new GraphQLTransform({
      authConfig: {
        defaultAuthentication: {
          authenticationType: "AMAZON_COGNITO_USER_POOLS"
        },
        additionalAuthenticationProviders: []
      },
      transformers: [modelTransformer, primaryKeyTransformer, indexTransformer, authTransformer],
      featureFlags: {
        getBoolean(value: string) {
          if (value === "useSubUsernameForDefaultIdentityClaim") {
            return true;
          } else if (value === "secondaryKeyAsGSI") {
            return true;
          }
          return false;
        },
        getNumber: jest.fn(),
        getObject: jest.fn()
      }
    });
    out = transformer.transform(validSchema);
  } catch (e) {
    console.error(`Failed to transform schema: ${e}`);
    expect(true).toEqual(false);
  }
  try {
    await awsS3Client
      .createBucket({
        Bucket: BUCKET_NAME
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
      BUILD_TIMESTAMP
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
        jwtToken: () => idToken1
      },
      disableOffline: true
    });
    await signupUser(USER_POOL_ID, USERNAME2, TMP_PASSWORD);
    const authRes2 = await authenticateUser(USERNAME2, TMP_PASSWORD, REAL_PASSWORD);
    const idToken2 = authRes2.getIdToken().getJwtToken();
    USER_POOL_AUTH_CLIENT_2 = new AWSAppSyncClient({
      url: GRAPHQL_ENDPOINT,
      region,
      auth: {
        type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
        jwtToken: () => idToken2
      },
      disableOffline: true
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

test("when identity claim is sub::username, user1 should not access user2 records when logging in with user1 and querying with GSI ", async () => {
  await createNote1(USER_POOL_AUTH_CLIENT_1, { noteId: "i1-u1", noteType: "t1" });
  await createNote1(USER_POOL_AUTH_CLIENT_1, { noteId: "i2-u1", noteType: "t1" });
  await createNote1(USER_POOL_AUTH_CLIENT_1, { noteId: "i3-u1", noteType: "t1" });
  await createNote1(USER_POOL_AUTH_CLIENT_2, { noteId: "i1-i2", noteType: "t1" });

  const note1IndexQueryResponse = await note1ByNoteTypeAndOwner(USER_POOL_AUTH_CLIENT_1, { noteType: 't1' });
  const resultItems = note1IndexQueryResponse.data.note1sByNoteTypeAndOwner.items;
  expect(resultItems).toBeDefined();
  expect(resultItems.filter(item => item.owner === USERNAME1).length).toBe(3);
  expect(resultItems.filter(item => item.owner === USERNAME2).length).toBe(0);
});

test("when identity claim is username, user1 should not access user2 records when logging in with user1 and querying with GSI ", async () => {
  await createNote2(USER_POOL_AUTH_CLIENT_1, { noteId: "i1-u1", noteType: "t1", owner: USERNAME1 });
  await createNote2(USER_POOL_AUTH_CLIENT_1, { noteId: "i2-u1", noteType: "t1", owner: USERNAME1 });
  await createNote2(USER_POOL_AUTH_CLIENT_1, { noteId: "i3-u1", noteType: "t1", owner: USERNAME1 });
  await createNote2(USER_POOL_AUTH_CLIENT_2, { noteId: "i1-i2", noteType: "t1", owner: USERNAME2 });

  const note2IndexQueryResponse = await note2ByNoteTypeAndOwner(USER_POOL_AUTH_CLIENT_1, { noteType: 't1' });
  const resultItems = note2IndexQueryResponse.data.note2sByNoteTypeAndOwner.items;
  expect(resultItems).toBeDefined();
  expect(resultItems.filter(item => item.owner === USERNAME1).length).toBe(3);
  expect(resultItems.filter(item => item.owner === USERNAME2).length).toBe(0);
});

/**
 * Helper function
 */
const createNote1 = async (
  client: AWSAppSyncClient<any>, 
  variables: { noteId: string, noteType: string },
  ): Promise<any> => {
  const result = await client.mutate<any>({
    mutation: gql`
      mutation CreateNote1($input: CreateNote1Input!){
        createNote1(input: $input) {
            noteId
            noteType
            owner
        }
      }
    `,
    variables: {
      input: variables
    },
    fetchPolicy: "no-cache"
  });
  return result;
}
const createNote2 = async (
  client: AWSAppSyncClient<any>, 
  variables: { noteId: string, noteType: string, owner: string },
  ): Promise<any> => {
  const result = await client.mutate<any>({
    mutation: gql`
      mutation CreateNote2($input: CreateNote2Input!){
        createNote2(input: $input) {
            noteId
            noteType
            owner
        }
      }
    `,
    variables: {
      input: variables
    },
    fetchPolicy: "no-cache"
  });
  return result;
}
const note1ByNoteTypeAndOwner = async (
  client: AWSAppSyncClient<any>,
  variables: { noteType: string },
): Promise<any> => {
  const result = await client.query<any>({
    query: gql`
      query Note1ByNoteTypeAndOwner($noteType: String!) {
        note1sByNoteTypeAndOwner(noteType: $noteType) {
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
}
const note2ByNoteTypeAndOwner = async (
  client: AWSAppSyncClient<any>,
  variables: { noteType: string },
): Promise<any> => {
  const result = await client.query<any>({
    query: gql`
      query Note2ByNoteTypeAndOwner($noteType: String!) {
        note2sByNoteTypeAndOwner(noteType: $noteType) {
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
}
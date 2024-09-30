import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import {
  BelongsToTransformer,
  HasManyTransformer,
  HasOneTransformer,
  ManyToManyTransformer,
} from '@aws-amplify/graphql-relational-transformer';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ResourceConstants } from 'graphql-transformer-common';
import { Output } from 'aws-sdk/clients/cloudformation';
import { S3, CognitoIdentityServiceProvider as CognitoClient } from 'aws-sdk';
import { default as moment } from 'moment';
import { v4 as uuid } from 'uuid';
import { CloudFormationClient } from '../CloudFormationClient';
import { GraphQLClient } from '../GraphQLClient';
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
import { resolveTestRegion } from '../testSetup';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

const region = resolveTestRegion();

jest.setTimeout(2000000);

const cf = new CloudFormationClient(region);
const customS3Client = new S3Client(region);
const awsS3Client = new S3({ region: region });
const cognitoClient = new CognitoClient({ apiVersion: '2016-04-19', region: region });
const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const UNIQUE_ID = uuid();
const STACK_NAME = `RelationalAuthV2TransformersFFTest-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `appsync-relational-auth-transformer-ff-test-${BUILD_TIMESTAMP}-${UNIQUE_ID}`;
const LOCAL_FS_BUILD_DIR = '/tmp/relational_auth_transformer_ff_tests/';
const S3_ROOT_DIR_KEY = 'deployments';

let GRAPHQL_ENDPOINT = undefined;

/**
 * Client 1 is logged in and is a member of the Admin group.
 */
let GRAPHQL_CLIENT_1 = undefined;

/**
 * Client 2 is logged in and is a member of the Devs group.
 */
let GRAPHQL_CLIENT_2 = undefined;

/**
 * Client 3 is logged in and has no group memberships.
 */
let GRAPHQL_CLIENT_3 = undefined;

let USER_POOL_ID = undefined;

const USERNAME1 = 'user1@test.com';
const USERNAME2 = 'user2@test.com';
const USERNAME3 = 'user3@test.com';
const TMP_PASSWORD = 'Password123!';
const REAL_PASSWORD = 'Password1234!';

const ADMIN_GROUP_NAME = 'Admin';
const DEVS_GROUP_NAME = 'Devs';
const PARTICIPANT_GROUP_NAME = 'Participant';
const WATCHER_GROUP_NAME = 'Watcher';

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

beforeAll(async () => {
  const validSchema = `
    type Post @model @auth(rules: [{allow: owner}]) {
      id: ID!
      title: String!
      author: User @belongsTo(fields: ["owner"])
      owner: ID! @index(name: "byOwner", sortKeyFields: ["id"])
    }

    type User @model @auth(rules: [{ allow: owner }]) {
      id: ID!
      posts: [Post] @hasMany(indexName: "byOwner", fields: ["id"])
    }

    type FieldProtected @model @auth(rules: [{ allow: private }, { allow: owner, operations: [read] }]) {
      id: ID!
      owner: String
      ownerOnly: String @auth(rules: [{allow: owner}])
    }

    type OpenTopLevel @model @auth(rules: [{allow: private}]) {
      id: ID!
      name: String
      owner: String
      protected: [ConnectionProtected] @hasMany(indexName: "byTopLevel", fields: ["id"])
    }

    type ConnectionProtected @model(queries: null) @auth(rules: [{allow: owner}]) {
      id: ID!
      name: String
      owner: String
      topLevelID: ID! @index(name: "byTopLevel", sortKeyFields: ["id"])
      topLevel: OpenTopLevel @belongsTo(fields: ["topLevelID"])
    }
      
    type Case @model @auth(rules: [{allow: owner}]) {
      id: ID!
      name: String
      owner: String
      managerId: ID
      manager: Manager @belongsTo(fields: ["managerId"])
    }

    type Manager @model @auth(rules: [{allow: owner}]) {
      id: ID!
      name: String
      owner: String
      caseId: ID
      case: Case @hasOne(fields: ["caseId"])
    }`;
  let out;
  try {
    const modelTransformer = new ModelTransformer();
    const indexTransformer = new IndexTransformer();
    const hasOneTransformer = new HasOneTransformer();
    const authTransformer = new AuthTransformer();
    out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      },
      /**
       * No transformer parameters are provided.
       * In that case, 'subscriptionsInheritPrimaryAuth' is set to 'false' and relational fields must be redacted
       * when auth rules do not match between primary and related models.
       */
      transformers: [
        modelTransformer,
        new PrimaryKeyTransformer(),
        indexTransformer,
        hasOneTransformer,
        new HasManyTransformer(),
        new BelongsToTransformer(),
        new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer),
        authTransformer,
      ],
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
    console.log(`bucket name: ${BUCKET_NAME}`);
    console.error(`Failed to create S3 bucket: ${e}`);
    expect(true).toEqual(false);
  }
  const userPoolResponse = await createUserPool(cognitoClient, `UserPool${STACK_NAME}`);
  USER_POOL_ID = userPoolResponse.UserPool.Id;
  const userPoolClientResponse = await createUserPoolClient(cognitoClient, USER_POOL_ID, `UserPool${STACK_NAME}`);
  const userPoolClientId = userPoolClientResponse.UserPoolClient.ClientId;
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
    const apiKey = getApiKey(finishedStack.Outputs);
    GRAPHQL_ENDPOINT = getApiEndpoint(finishedStack.Outputs);
    expect(apiKey).not.toBeTruthy();

    // Verify we have all the details
    expect(GRAPHQL_ENDPOINT).toBeTruthy();
    expect(USER_POOL_ID).toBeTruthy();
    expect(userPoolClientId).toBeTruthy();

    // Configure Amplify, create users, and sign in.
    configureAmplify(USER_POOL_ID, userPoolClientId);

    await signupUser(USER_POOL_ID, USERNAME1, TMP_PASSWORD);
    await signupUser(USER_POOL_ID, USERNAME2, TMP_PASSWORD);
    await signupUser(USER_POOL_ID, USERNAME3, TMP_PASSWORD);

    await createGroup(USER_POOL_ID, ADMIN_GROUP_NAME);
    await createGroup(USER_POOL_ID, PARTICIPANT_GROUP_NAME);
    await createGroup(USER_POOL_ID, WATCHER_GROUP_NAME);
    await createGroup(USER_POOL_ID, DEVS_GROUP_NAME);
    await addUserToGroup(ADMIN_GROUP_NAME, USERNAME1, USER_POOL_ID);
    await addUserToGroup(PARTICIPANT_GROUP_NAME, USERNAME1, USER_POOL_ID);
    await addUserToGroup(WATCHER_GROUP_NAME, USERNAME1, USER_POOL_ID);
    await addUserToGroup(DEVS_GROUP_NAME, USERNAME2, USER_POOL_ID);
    const authResAfterGroup: any = await authenticateUser(USERNAME1, TMP_PASSWORD, REAL_PASSWORD);

    const idToken = authResAfterGroup.getIdToken().getJwtToken();
    GRAPHQL_CLIENT_1 = new GraphQLClient(GRAPHQL_ENDPOINT, { Authorization: idToken });

    const authRes2AfterGroup: any = await authenticateUser(USERNAME2, TMP_PASSWORD, REAL_PASSWORD);
    const idToken2 = authRes2AfterGroup.getIdToken().getJwtToken();
    GRAPHQL_CLIENT_2 = new GraphQLClient(GRAPHQL_ENDPOINT, { Authorization: idToken2 });

    const authRes3: any = await authenticateUser(USERNAME3, TMP_PASSWORD, REAL_PASSWORD);
    const idToken3 = authRes3.getIdToken().getJwtToken();
    GRAPHQL_CLIENT_3 = new GraphQLClient(GRAPHQL_ENDPOINT, { Authorization: idToken3 });

    // Wait for any propagation to avoid random
    // "The security token included in the request is invalid" errors
    await new Promise<void>((res) => setTimeout(() => res(), 5000));
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
test('creating a post and immediately view it via the User.posts connection.', async () => {
  const createUser1 = await GRAPHQL_CLIENT_1.query(
    `mutation {
        createUser(input: { id: "user1@test.com" }) {
            id
            posts {
              items {
                id
                title
                owner
              }
            }
        }
    }`,
    {},
  );
  expect(createUser1.data.createUser.id).toEqual('user1@test.com');
  expect(createUser1.data.createUser.posts).toBeDefined();
  expect(createUser1.data.createUser.posts.items).toBeDefined();
  expect(createUser1.data.createUser.posts.items).toHaveLength(0);

  const response = await GRAPHQL_CLIENT_1.query(
    `mutation {
        createPost(input: { title: "Hello, World!", owner: "user1@test.com" }) {
            id
            title
            owner
            author {
              id
            }
        }
    }`,
    {},
  );
  expect(response.data.createPost.id).toBeDefined();
  expect(response.data.createPost.title).toEqual('Hello, World!');
  expect(response.data.createPost.owner).toBeDefined();
  expect(response.data.createPost.author).toBeNull();

  const getResponse = await GRAPHQL_CLIENT_1.query(
    `query {
        getUser(id: "user1@test.com") {
            posts {
                items {
                    id
                    title
                    owner
                    author {
                        id
                    }
                }
            }
        }
    }`,
    {},
  );
  expect(getResponse.data.getUser.posts.items[0].id).toBeDefined();
  expect(getResponse.data.getUser.posts.items[0].title).toEqual('Hello, World!');
  expect(getResponse.data.getUser.posts.items[0].owner).toEqual('user1@test.com');
  expect(getResponse.data.getUser.posts.items[0].author.id).toEqual('user1@test.com');
});

test('that hasMany and belongsTo redact relational fields', async () => {
  const response1 = await GRAPHQL_CLIENT_1.query(
    `mutation {
        createOpenTopLevel(input: { id: "1", owner: "${USERNAME1}", name: "open" }) {
            id
            owner
            name
            protected {
              items {
                id
                name
                owner
              }
            }
        }
    }`,
    {},
  );
  expect(response1.data.createOpenTopLevel.id).toEqual('1');
  expect(response1.data.createOpenTopLevel.owner).toEqual(USERNAME1);
  expect(response1.data.createOpenTopLevel.name).toEqual('open');
  expect(response1.data.createOpenTopLevel.protected).toBeDefined();
  expect(response1.data.createOpenTopLevel.protected.items).toBeDefined();
  expect(response1.data.createOpenTopLevel.protected.items).toHaveLength(0);

  const response2 = await GRAPHQL_CLIENT_1.query(
    `mutation {
        createConnectionProtected(input: { id: "1", owner: "${USERNAME1}", name: "closed", topLevelID: "1" }) {
          id
          owner
          name
          topLevelID
          topLevel {
            id
            owner
            name
          }
        }
    }`,
    {},
  );
  expect(response2.data.createConnectionProtected.id).toEqual('1');
  expect(response2.data.createConnectionProtected.owner).toEqual(USERNAME1);
  expect(response2.data.createConnectionProtected.name).toEqual('closed');
  expect(response2.data.createConnectionProtected.topLevelID).toEqual('1');
  expect(response2.data.createConnectionProtected.topLevel).toBeNull();

  const response3 = await GRAPHQL_CLIENT_1.query(
    `query {
        getOpenTopLevel(id: "1") {
            id
            protected {
                items {
                    id
                    name
                    owner
                }
            }
        }
    }`,
    {},
  );
  expect(response3.data.getOpenTopLevel.id).toEqual('1');
  expect(response3.data.getOpenTopLevel.protected.items).toHaveLength(1);
  expect(response3.data.getOpenTopLevel.protected.items[0].id).toEqual('1');
  expect(response3.data.getOpenTopLevel.protected.items[0].name).toEqual('closed');
  expect(response3.data.getOpenTopLevel.protected.items[0].owner).toEqual(USERNAME1);

  const response4 = await GRAPHQL_CLIENT_1.query(
    `mutation {
        updateOpenTopLevel(input: { id: "1", owner: "${USERNAME1}", name: "closed" }) {
            id
            owner
            name
            protected {
              items {
                id
                name
                owner
              }
            }
        }
    }`,
    {},
  );
  expect(response4.data.updateOpenTopLevel.id).toEqual('1');
  expect(response4.data.updateOpenTopLevel.owner).toEqual(USERNAME1);
  expect(response4.data.updateOpenTopLevel.name).toEqual('closed');
  expect(response4.data.updateOpenTopLevel.protected).toBeDefined();
  expect(response4.data.updateOpenTopLevel.protected.items).toBeDefined();
  expect(response4.data.updateOpenTopLevel.protected.items).toHaveLength(0);
});

test('that @hasOne and @belongsTo do not redact relational fields', async () => {
  const response1 = await GRAPHQL_CLIENT_2.query(
    `mutation {
        createManager(input: { id: "1", owner: "${USERNAME2}", name: "${USERNAME2}" }) {
            id
            owner
            name
            caseId
            case {
                id
                owner
                name
            }
        }
    }`,
    {},
  );
  expect(response1.data.createManager.id).toEqual('1');
  expect(response1.data.createManager.owner).toEqual(USERNAME2);
  expect(response1.data.createManager.name).toEqual(USERNAME2);
  expect(response1.data.createManager.caseId).toBeNull();
  expect(response1.data.createManager.case).toBeNull();

  const response2 = await GRAPHQL_CLIENT_2.query(
    `mutation {
        createCase(input: { id: "1", owner: "${USERNAME2}", name: "case a", managerId: "1" }) {
          id
          owner
          name
          managerId
          manager {
            id
            owner
            name
          }
        }
    }`,
    {},
  );
  expect(response2.data.createCase.id).toEqual('1');
  expect(response2.data.createCase.owner).toEqual(USERNAME2);
  expect(response2.data.createCase.name).toEqual('case a');
  expect(response2.data.createCase.managerId).toEqual('1');
  expect(response2.data.createCase.manager).toBeNull();

  const response3 = await GRAPHQL_CLIENT_2.query(
    `query {
        getCase(id: "1") {
            id
            name
            owner
            managerId
            manager {
                id
                name
                owner
            }
        }
    }`,
    {},
  );
  expect(response3.data.getCase.id).toEqual('1');
  expect(response3.data.getCase.owner).toEqual(USERNAME2);
  expect(response3.data.getCase.name).toEqual('case a');
  expect(response3.data.getCase.managerId).toEqual('1');
  expect(response3.data.getCase.manager).toBeDefined();
  expect(response3.data.getCase.manager.id).toEqual('1');
  expect(response3.data.getCase.manager.owner).toEqual(USERNAME2);
  expect(response3.data.getCase.manager.name).toEqual(USERNAME2);

  const response4 = await GRAPHQL_CLIENT_2.query(
    `mutation {
        updateManager(input: { id: "1", owner: "${USERNAME2}", name: "${USERNAME2}", caseId: "1" }) {
            id
            owner
            name
            caseId
            case {
                id
                owner
                name
            }
        }
    }`,
    {},
  );
  expect(response4.data.updateManager.id).toEqual('1');
  expect(response4.data.updateManager.owner).toEqual(USERNAME2);
  expect(response4.data.updateManager.name).toEqual(USERNAME2);
  expect(response4.data.updateManager.caseId).toEqual('1');
  expect(response4.data.updateManager.case).toBeNull();
});

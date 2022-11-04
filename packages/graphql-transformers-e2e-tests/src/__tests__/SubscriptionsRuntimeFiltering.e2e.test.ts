import { GRAPHQL_AUTH_MODE } from '@aws-amplify/api';
import { AWS } from '@aws-amplify/core';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform } from '@aws-amplify/graphql-transformer-core';
import { API, Auth } from 'aws-amplify';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { CognitoIdentity, CognitoIdentityServiceProvider as CognitoClient, S3 } from 'aws-sdk';
import { Output } from 'aws-sdk/clients/cloudformation';
import gql from 'graphql-tag';
import { ResourceConstants } from 'graphql-transformer-common';
import 'isomorphic-fetch';
import { default as moment } from 'moment';
import * as Observable from 'zen-observable';
import { CloudFormationClient } from '../CloudFormationClient';
import {
  addUserToGroup, authenticateUser, configureAmplify, createGroup, createIdentityPool, createUserPool,
  createUserPoolClient, signupUser
} from '../cognitoUtils';
import { cleanupStackAfterTest, deploy } from '../deployNestedStacks';
import { IAMHelper } from '../IAMHelper';
import { withTimeOut } from '../promiseWithTimeout';
import { S3Client } from '../S3Client';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');
// to deal with subscriptions in node env
(global as any).WebSocket = require('ws');

// To overcome of the way of how AmplifyJS picks up currentUserCredentials
const anyAWS = AWS as any;
if (anyAWS && anyAWS.config && anyAWS.config.credentials) {
  delete anyAWS.config.credentials;
}

// delay times
const SUBSCRIPTION_DELAY = 10000;
const PROPAGATION_DELAY = 5000;
const JEST_TIMEOUT = 2000000;
const SUBSCRIPTION_TIMEOUT = 10000;

jest.setTimeout(JEST_TIMEOUT);

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

const AWS_REGION = 'us-west-2';
const cf = new CloudFormationClient(AWS_REGION);
const customS3Client = new S3Client(AWS_REGION);
const cognitoClient = new CognitoClient({ apiVersion: '2016-04-19', region: AWS_REGION });
const identityClient = new CognitoIdentity({ apiVersion: '2014-06-30', region: AWS_REGION });
const iamHelper = new IAMHelper(AWS_REGION);
const awsS3Client = new S3({ region: AWS_REGION });

// stack info
const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const STACK_NAME = `SubscriptionRTFTests-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `subscription-rtf-tests-bucket-${BUILD_TIMESTAMP}`;
const LOCAL_FS_BUILD_DIR = '/tmp/subscription_rtf_tests/';
const S3_ROOT_DIR_KEY = 'deployments';
const AUTH_ROLE_NAME = `${STACK_NAME}-authRole`;
const UNAUTH_ROLE_NAME = `${STACK_NAME}-unauthRole`;
let USER_POOL_ID: string;
let IDENTITY_POOL_ID: string;
let GRAPHQL_ENDPOINT: string;
let API_KEY: string;

/**
 * Client 1 is logged in and is a member of the Admin group.
 */
let GRAPHQL_CLIENT_1: AWSAppSyncClient<any> = undefined;

/**
 * Client 2 is logged in and is a member of the Devs group.
 */
let GRAPHQL_CLIENT_2: AWSAppSyncClient<any> = undefined;

/**
 * Auth IAM Client
 */
let GRAPHQL_IAM_AUTH_CLIENT: AWSAppSyncClient<any> = undefined;

const USERNAME1 = 'user1@test.com';
const USERNAME2 = 'user2@test.com';
const USERNAME3 = 'user3@test.com';
const TMP_PASSWORD = 'Password123!';
const REAL_PASSWORD = 'Password1234!';

const INSTRUCTOR_GROUP_NAME = 'Instructor';
const MEMBER_GROUP_NAME = 'Member';
const ADMIN_GROUP_NAME = 'Admin';

// interface inputs
interface CreateTaskInput {
  id?: string;
  title?: string,
  description?: string,
  priority?: number,
  severity?: number,
  owner?: string
  readOwners?: string[]
}

interface UpdateTaskInput {
  id?: string;
  title?: string,
  description?: string,
  priority?: number,
  severity?: number,
  owner?: string
  readOwners?: string[]
}

interface DeleteTaskInput {
  id?: string;
  title?: string,
  description?: string,
  priority?: number,
  severity?: number,
  owner?: string
  readOwners?: string[]
}

interface CreateTaskGroupInput {
  id?: string;
  title?: string;
  description?: string;
  priority?: number;
  severity?: number;
  groups?: string[];
  singleGroup?: string;
}

interface UpdateTaskGroupInput {
  id?: string;
  title?: string;
  description?: string;
  priority?: number;
  severity?: number;
  groups?: string[];
  singleGroup?: string;
}

interface DeleteTaskGroupInput {
  id?: string;
  title?: string;
  description?: string;
  priority?: number;
  severity?: number;
  groups?: string[];
  singleGroup?: string;
}

interface CreateTodoInput {
  id?: string;
  name?: string;
  description?: string;
  level?: number;
  owner?: string;
  sharedOwners?: [string];
  status?: string;
}

interface UpdateTodoInput {
  id?: string;
  name?: string;
  description?: string;
  level?: number;
  owner?: string;
  sharedOwners?: [string];
  status?: string;
}

interface DeleteTodoInput {
  id?: string;
  name?: string;
  description?: string;
  level?: number;
  owner?: string;
  sharedOwners?: [string];
  status?: string;
}

beforeEach(async () => {
  try {
    await Auth.signOut();
  } catch (ex) {
    // don't need to fail tests on this error
  }
});

beforeAll(async () => {
  const validSchema = `
  type Task @model
  @auth(rules: [
      {allow: owner, ownerField: "owner", identityClaim: "username"}
      {allow: owner, ownerField: "readOwners", operations: [read], identityClaim: "username"}
  ]) {
      id: String,
      title: String,
      description: String,
      priority: Int,
      severity: Int,
      owner: String
      readOwners: [String]
  }
  
  type Todo @model
  @auth(rules: [
      {allow: groups, groups: ["Admin"]}
      {allow: owner, ownerField: "owner", identityClaim: "username"}
      {allow: owner, ownerField: "sharedOwners", identityClaim: "username"}
  ]) {
      id: String,
      name: String,
      description: String,
      level: Int,
      owner: String
      sharedOwners: [String]
      status: TodoStatus
  }

  type TaskGroup @model
  @auth(rules: [
      { allow: groups, groupsField: "groups" },
      { allow: groups, groupsField: "singleGroup" }
  ]) {
      id: String,
      title: String,
      description: String,
      priority: Int,
      severity: Int
      groups: [String]
      singleGroup: String
  }
  
  enum TodoStatus {
    NOTSTARTED
    STARTED
    COMPLETED
  }`;
  const transformer = new GraphQLTransform({
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'API_KEY',
          apiKeyConfig: {
            description: 'E2E Test API Key',
            apiKeyExpirationDays: 300,
          },
        },
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
    featureFlags: {
      getBoolean: (value: string, defaultValue?: boolean) => {
        if (value === 'useSubUsernameForDefaultIdentityClaim') {
          return false;
        }
        return defaultValue;
      },


      getNumber: jest.fn(),
      getObject: jest.fn(),
    },
  });

  try {
    await awsS3Client.createBucket({ Bucket: BUCKET_NAME }).promise();
  } catch (e) {
    console.error(`Failed to create bucket: ${e}`);
  }

  // create userpool
  const userPoolResponse = await createUserPool(cognitoClient, `UserPool${STACK_NAME}`);
  USER_POOL_ID = userPoolResponse.UserPool.Id;
  const userPoolClientResponse = await createUserPoolClient(cognitoClient, USER_POOL_ID, `UserPool${STACK_NAME}`);
  const userPoolClientId = userPoolClientResponse.UserPoolClient.ClientId;
  // create auth and unauthroles
  const { authRole, unauthRole } = await iamHelper.createRoles(AUTH_ROLE_NAME, UNAUTH_ROLE_NAME);
  // create identitypool
  IDENTITY_POOL_ID = await createIdentityPool(identityClient, `IdentityPool${STACK_NAME}`, {
    authRoleArn: authRole.Arn,
    unauthRoleArn: unauthRole.Arn,
    providerName: `cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`,
    clientId: userPoolClientId,
  });
  const out = transformer.transform(validSchema);
  const finishedStack = await deploy(
    customS3Client,
    cf,
    STACK_NAME,
    out,
    { AuthCognitoUserPoolId: USER_POOL_ID, authRoleName: authRole.RoleName, unauthRoleName: unauthRole.RoleName },
    LOCAL_FS_BUILD_DIR,
    BUCKET_NAME,
    S3_ROOT_DIR_KEY,
    BUILD_TIMESTAMP,
  );

  expect(finishedStack).toBeDefined();
  const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
  const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
  GRAPHQL_ENDPOINT = getApiEndpoint(finishedStack.Outputs);

  API_KEY = getApiKey(finishedStack.Outputs);
  expect(API_KEY).toBeTruthy();

  // Verify we have all the details
  expect(GRAPHQL_ENDPOINT).toBeTruthy();
  expect(USER_POOL_ID).toBeTruthy();
  expect(userPoolClientId).toBeTruthy();

  // Configure Amplify, create users, and sign in
  configureAmplify(USER_POOL_ID, userPoolClientId, IDENTITY_POOL_ID);

  await signupUser(USER_POOL_ID, USERNAME1, TMP_PASSWORD);
  await signupUser(USER_POOL_ID, USERNAME2, TMP_PASSWORD);
  await signupUser(USER_POOL_ID, USERNAME3, TMP_PASSWORD);

  await createGroup(USER_POOL_ID, INSTRUCTOR_GROUP_NAME);
  await createGroup(USER_POOL_ID, MEMBER_GROUP_NAME);
  await createGroup(USER_POOL_ID, ADMIN_GROUP_NAME);
  // User1: Admin and Instructor
  // User2: Member and Instructor
  // User3: No group assigned
  await addUserToGroup(ADMIN_GROUP_NAME, USERNAME1, USER_POOL_ID);
  await addUserToGroup(MEMBER_GROUP_NAME, USERNAME2, USER_POOL_ID);
  await addUserToGroup(INSTRUCTOR_GROUP_NAME, USERNAME1, USER_POOL_ID);
  await addUserToGroup(INSTRUCTOR_GROUP_NAME, USERNAME2, USER_POOL_ID);

  // authenticate user3 we'll use amplify api for subscription calls
  await authenticateUser(USERNAME3, TMP_PASSWORD, REAL_PASSWORD);

  const authResAfterGroup: any = await authenticateUser(USERNAME1, TMP_PASSWORD, REAL_PASSWORD);
  const idToken = authResAfterGroup.getIdToken().getJwtToken();
  GRAPHQL_CLIENT_1 = new AWSAppSyncClient({
    url: GRAPHQL_ENDPOINT,
    region: AWS_REGION,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
      jwtToken: idToken,
    },
  });
  const authRes2AfterGroup: any = await authenticateUser(USERNAME2, TMP_PASSWORD, REAL_PASSWORD);
  const idToken2 = authRes2AfterGroup.getIdToken().getJwtToken();
  GRAPHQL_CLIENT_2 = new AWSAppSyncClient({
    url: GRAPHQL_ENDPOINT,
    region: AWS_REGION,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
      jwtToken: idToken2,
    },
  });

  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const authCreds = await Auth.currentCredentials();
  GRAPHQL_IAM_AUTH_CLIENT = new AWSAppSyncClient({
    url: GRAPHQL_ENDPOINT,
    region: AWS_REGION,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.AWS_IAM,
      credentials: authCreds,
    },
  });
  // Wait for any propagation to avoid random
  // "The security token included in the request is invalid" errors
  await new Promise(res => setTimeout(res, PROPAGATION_DELAY));
});

afterAll(async () => {
  await cleanupStackAfterTest(
    BUCKET_NAME,
    STACK_NAME,
    cf,
    { cognitoClient, userPoolId: USER_POOL_ID },
    { identityClient, identityPoolId: IDENTITY_POOL_ID },
  );
  await iamHelper.deleteRole(AUTH_ROLE_NAME);
  await iamHelper.deleteRole(UNAUTH_ROLE_NAME);
});

/**
 * Tests
 */

/**
 * Subscriptions with runtime filtering basic use case
 * User1 is running the mutation and subscription
 */
test('Basic runtime filtering with subscriptions work', async () => {
  reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const observer = API.graphql({
    // @ts-ignore
    query: gql`
      subscription OnCreateTask {
        onCreateTask(filter: {
          and: [
            { priority: { eq: 8 } }
            { severity: { gt: 5 } }
          ]
        }) {
          id
          title
          description
          priority
          severity
          owner
          readOwners
        }
      }
    `,
    authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  }) as unknown as Observable<any>;
  let subscription: ZenObservable.Subscription;
  const subscriptionPromise = new Promise((resolve, _) => {
    subscription = observer.subscribe((event: any) => {
      const task = event.value.data.onCreateTask;
      subscription.unsubscribe();
      expect(task.title).toEqual('task2');
      expect(task.description).toEqual('description2');
      expect(task.priority).toEqual(8);
      expect(task.severity).toEqual(7);
      resolve(undefined);
    });
  });

  await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));

  await createTask(GRAPHQL_CLIENT_1, {
    title: 'task1',
    description: 'description1',
    priority: 5,
    severity: 5,
  });

  await createTask(GRAPHQL_CLIENT_1, {
    title: 'task2',
    description: 'description2',
    priority: 8,
    severity: 7,
  });

  return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTask Subscription timed out', () => {
    subscription?.unsubscribe();
  });
});

/**
 * Runtime filtering supports multiple owners auth
 * User1 is running the subscription and User2 is running the mutations
 */
test('Multiple owners auth is supported for subscriptions', async () => {
  reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const observer = API.graphql({
    // @ts-ignore
    query: gql`
      subscription OnCreateTask(
        $filter: ModelSubscriptionTaskFilterInput
        $owner: String
      ) {
        onCreateTask(filter: $filter, owner: $owner) {
          id
          title
          description
          priority
          severity
          owner
          readOwners
        }
      }
    `,
    authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  }) as unknown as Observable<any>;
  let subscription: ZenObservable.Subscription;
  const subscriptionPromise = new Promise((resolve, _) => {
    subscription = observer.subscribe((event: any) => {
      const task = event.value.data.onCreateTask;
      subscription.unsubscribe();
      expect(task.title).toEqual('task3');
      expect(task.description).toEqual('description3');
      expect(task.priority).toEqual(1);
      expect(task.severity).toEqual(2);
      resolve(undefined);
    });
  });

  await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));

  await createTask(GRAPHQL_CLIENT_2, {
    title: 'task3',
    description: 'description3',
    priority: 1,
    severity: 2,
    readOwners: [USERNAME1],
  });

  return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTask Subscription timed out', () => {
    subscription?.unsubscribe();
  });
});

/**
 * Runtime filtering supports multiple owners auth and filter argument
 * User1 is running the subscription and User2 is running the mutations
 */
test('Basic runtime filtering with subscriptions and multiple owners auth work', async () => {
  reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const observer = API.graphql({
    // @ts-ignore
    query: gql`
      subscription OnCreateTask(
          $filter: ModelSubscriptionTaskFilterInput
          $owner: String
        ) {
        onCreateTask(filter: $filter, owner: $owner) {
          id
          title
          description
          priority
          severity
          owner
          readOwners
        }
      }
    `,
    variables: {
      filter: {
        or: [
          { priority: { gt: 5 } },
          { severity: { gt: 5 } },
        ]
      },
    },
    authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  }) as unknown as Observable<any>;
  let subscription: ZenObservable.Subscription;
  const subscriptionPromise = new Promise((resolve, _) => {
    subscription = observer.subscribe((event: any) => {
      const task = event.value.data.onCreateTask;
      subscription.unsubscribe();
      expect(task.title).toEqual('task5');
      expect(task.description).toEqual('description5');
      expect(task.priority).toEqual(1);
      expect(task.severity).toEqual(6);
      resolve(undefined);
    });
  });

  await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));

  await createTask(GRAPHQL_CLIENT_2, {
    title: 'task4',
    description: 'description4',
    priority: 4,
    severity: 4,
  });

  await createTask(GRAPHQL_CLIENT_2, {
    title: 'task5',
    description: 'description5',
    priority: 1,
    severity: 6,
    readOwners: [USERNAME1],
  });

  return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTask Subscription timed out', () => {
    subscription?.unsubscribe();
  });
});

/**
 * Runtime filtering on update mutation
 * User1 is running the subscription and User2 is running the mutations
 */
test('Runtime filtering works with update mutation and multiple owners auth', async () => {
  reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const observer = API.graphql({
    // @ts-ignore
    query: gql`
      subscription OnUpdateTask {
        onUpdateTask(filter: {
          or: [
            { priority: { lt: 5 } }
            { severity: { lt: 5 } }
          ]
        }) {
          id
          title
          description
          priority
          severity
          owner
          readOwners
        }
      }
    `,
    authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  }) as unknown as Observable<any>;
  let subscription: ZenObservable.Subscription;
  const subscriptionPromise = new Promise((resolve, _) => {
    subscription = observer.subscribe((event: any) => {
      const task = event.value.data.onUpdateTask;
      subscription.unsubscribe();
      expect(task.title).toEqual('task7');
      expect(task.description).toEqual('description7');
      expect(task.priority).toEqual(2);
      expect(task.severity).toEqual(3);
      resolve(undefined);
    });
  });

  await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));

  await createTask(GRAPHQL_CLIENT_2, {
    id: 'task-06',
    title: 'task6',
    description: 'description6',
    priority: 6,
    severity: 6,
    readOwners: [USERNAME1],
  });

  await createTask(GRAPHQL_CLIENT_2, {
    id: 'task-07',
    title: 'task7',
    description: 'description7',
    priority: 2,
    severity: 3,
    readOwners: [USERNAME1],
  });

  await updateTask(GRAPHQL_CLIENT_2, {
    id: 'task-06',
    title: 'task6',
    description: 'description6',
    priority: 6,
    severity: 6,
    readOwners: [USERNAME1],
  });

  await updateTask(GRAPHQL_CLIENT_2, {
    id: 'task-07',
    title: 'task7',
    description: 'description7',
    priority: 2,
    severity: 3,
    readOwners: [USERNAME1],
  });

  return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTask Subscription timed out', () => {
    subscription?.unsubscribe();
  });
});

/**
 * Runtime filtering on delete mutation
 * User1 is running the subscription and User2 is running the mutations
 */
test('Runtime filtering works with delete mutation and multiple owners auth', async () => {
  reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const observer = API.graphql({
    // @ts-ignore
    query: gql`
      subscription OnDeleteTask {
        onDeleteTask(filter: {
          severity: { eq: 10 }
        }) {
          id
          title
          description
          priority
          severity
          owner
          readOwners
        }
      }
    `,
    authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  }) as unknown as Observable<any>;
  let subscription: ZenObservable.Subscription;
  const subscriptionPromise = new Promise((resolve, _) => {
    subscription = observer.subscribe((event: any) => {
      const task = event.value.data.onDeleteTask;
      subscription.unsubscribe();
      expect(task.title).toEqual('task9');
      expect(task.description).toEqual('description9');
      expect(task.priority).toEqual(3);
      expect(task.severity).toEqual(10);
      resolve(undefined);
    });
  });

  await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));

  await createTask(GRAPHQL_CLIENT_2, {
    id: 'task-08',
    title: 'task8',
    description: 'description8',
    priority: 8,
    severity: 8,
    readOwners: [USERNAME1],
  });

  await createTask(GRAPHQL_CLIENT_2, {
    id: 'task-09',
    title: 'task9',
    description: 'description9',
    priority: 3,
    severity: 10,
    readOwners: [USERNAME1],
  });

  await deleteTask(GRAPHQL_CLIENT_2, {
    id: 'task-08',
  });

  await deleteTask(GRAPHQL_CLIENT_2, {
    id: 'task-09',
  });

  return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTask Subscription timed out', () => {
    subscription?.unsubscribe();
  });
});

const reconfigureAmplifyAPI = (appSyncAuthType: string, apiKey?: string):void => {
  if (appSyncAuthType === 'API_KEY') {
    API.configure({
      aws_appsync_graphqlEndpoint: GRAPHQL_ENDPOINT,
      aws_appsync_region: AWS_REGION,
      aws_appsync_authenticationType: appSyncAuthType,
      aws_appsync_apiKey: apiKey,
    });
  } else {
    API.configure({
      aws_appsync_graphqlEndpoint: GRAPHQL_ENDPOINT,
      aws_appsync_region: AWS_REGION,
      aws_appsync_authenticationType: appSyncAuthType,
    });
  }
};

test('Static group auth should get precedence over owner argument', async () => {
  reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const observer = API.graphql({
    // @ts-ignore
    query: gql`
      subscription OnCreateTodo {
        onCreateTodo(owner: "${USERNAME2}") {
          id
          name
          description
          level
          owner
          sharedOwners
          status
        }
      }
    `,
    authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  }) as unknown as Observable<any>;
  let subscription: ZenObservable.Subscription;
  const subscriptionPromise = new Promise((resolve, _) => {
    subscription = observer.subscribe((event: any) => {
      const todo = event.value.data.onCreateTodo;
      subscription.unsubscribe();
      expect(todo.name).toEqual('todo1');
      expect(todo.description).toEqual('description1');
      expect(todo.level).toEqual(4);
      resolve(undefined);
    });
  });

  await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));

  await createTodo(GRAPHQL_CLIENT_2, {
    name: 'todo1',
    description: 'description1',
    level: 4,
    owner: USERNAME2,
    status: 'NOTSTARTED',
  });

  return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTodo Subscription timed out', () => {
    subscription?.unsubscribe();
  });
});

test('Runtime Filter with AND condition and IN & BEGINSWITH operators', async () => {
  reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const observer = API.graphql({
    // @ts-ignore
    query: gql`
      subscription OnCreateTodo {
        onCreateTodo(filter: {
          and: [
            {name: { in: ["todo", "test", "Testing"]}}
            {description: { beginsWith: "Test"}}
          ]
        }) {
          id
          name
          description
          level
          owner
          sharedOwners
          status
        }
      }
    `,
    authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  }) as unknown as Observable<any>;
  let subscription: ZenObservable.Subscription;
  const subscriptionPromise = new Promise((resolve, _) => {
    subscription = observer.subscribe((event: any) => {
      const todo = event.value.data.onCreateTodo;
      subscription.unsubscribe();
      expect(todo.name).toEqual('Testing');
      expect(todo.description).toEqual('Testing Desc');
      expect(todo.level).toEqual(6);
      resolve(undefined);
    });
  });

  await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));

  await createTodo(GRAPHQL_CLIENT_1, {
    name: 'todo',
    description: 'description2',
    level: 4,
    owner: USERNAME1,
    status: 'NOTSTARTED',
  });

  await createTodo(GRAPHQL_CLIENT_1, {
    name: 'Test',
    description: 'description3',
    level: 5,
    owner: USERNAME1,
    status: 'NOTSTARTED',
  });

  await createTodo(GRAPHQL_CLIENT_1, {
    name: 'Testing',
    description: 'Testing Desc',
    level: 6,
    owner: USERNAME1,
    status: 'NOTSTARTED',
  });

  return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTodo Subscription timed out', () => {
    subscription?.unsubscribe();
  });
});

test('Runtime Filter with OR condition and NOTIN & BETWEEN operators', async () => {
  reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const observer = API.graphql({
    // @ts-ignore
    query: gql`
      subscription OnCreateTodo {
        onCreateTodo(filter: {
          or: [
            {name: { notIn: ["todo", "test", "Testing"]}}
            {level: { between: [5, 10]}}
          ]
        }) {
          id
          name
          description
          level
          owner
          sharedOwners
          status
        }
      }
    `,
    authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  }) as unknown as Observable<any>;
  let subscription: ZenObservable.Subscription;
  const subscriptionPromise = new Promise((resolve, _) => {
    subscription = observer.subscribe((event: any) => {
      const todo = event.value.data.onCreateTodo;
      subscription.unsubscribe();
      expect(todo.name).toEqual('Test4');
      expect(todo.description).toEqual('description4');
      expect(todo.level).toEqual(8);
      resolve(undefined);
    });
  });

  await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));

  await createTodo(GRAPHQL_CLIENT_1, {
    name: 'todo',
    description: 'description2',
    level: 4,
    owner: USERNAME1,
    status: 'NOTSTARTED',
  });

  await createTodo(GRAPHQL_CLIENT_1, {
    name: 'Test4',
    description: 'description4',
    level: 8,
    owner: USERNAME1,
    status: 'NOTSTARTED',
  });

  return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTodo Subscription timed out', () => {
    subscription?.unsubscribe();
  });
});

test('Runtime Filter enum field type should be treated as string', async () => {
  reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
  await Auth.signIn(USERNAME1, REAL_PASSWORD);
  const observer = API.graphql({
    // @ts-ignore
    query: gql`
      subscription OnCreateTodo {
        onCreateTodo(filter: {
          status: { eq: "COMPLETED" }
        }) {
          id
          name
          description
          level
          owner
          sharedOwners
          status
        }
      }
    `,
    authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
  }) as unknown as Observable<any>;
  let subscription: ZenObservable.Subscription;
  const subscriptionPromise = new Promise((resolve, _) => {
    subscription = observer.subscribe((event: any) => {
      const todo = event.value.data.onCreateTodo;
      subscription.unsubscribe();
      expect(todo.name).toEqual('Test6');
      expect(todo.description).toEqual('description6');
      expect(todo.level).toEqual(8);
      expect(todo.status).toEqual('COMPLETED');
      resolve(undefined);
    });
  });

  await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));

  await createTodo(GRAPHQL_CLIENT_1, {
    name: 'todo5',
    description: 'description5',
    level: 4,
    owner: USERNAME1,
    status: 'NOTSTARTED',
  });

  await createTodo(GRAPHQL_CLIENT_1, {
    name: 'Test6',
    description: 'description6',
    level: 8,
    owner: USERNAME1,
    status: 'COMPLETED',
  });

  return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTodo Subscription timed out', () => {
    subscription?.unsubscribe();
  });
});

/**
 * Runtime filtering supports dynamic groups
 * User1: Admin and Instructor
 * User2: Member and Instructor
 * User1 is running subscription and User2 is running mutations
 */
describe('Runtime Filtering for Dynamic Group Auth', () => {
  describe('Multiple groups test', () => {
    test('Filter with create mutation', async () => {
      reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
      await Auth.signIn(USERNAME1, REAL_PASSWORD);
      const observer = API.graphql({
        // @ts-ignore
        query: gql`
          subscription OnCreateTaskGroup(
            $filter: ModelSubscriptionTaskGroupFilterInput
          ) {
            onCreateTaskGroup(filter: $filter) {
              id
              title
              description
              priority
              severity
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
        variables:{
          filter: {
            and: [
              { priority: { eq: 8 } },
              { severity: { gt: 5 } },
            ]
          },
        },
      }) as unknown as Observable<any>;
      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, reject) => {
        subscription = observer.subscribe(
          (event) => {
            // will unsubscribe on the first available subscription data
            const task = event.value.data.onCreateTaskGroup;
            subscription.unsubscribe();
            resolve(task);
          },
          (err) => {
            reject(err);
          }
        );
      });
      // Wait for a time period for subscription to be setup
      await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));
      // This should not be listened by User1 as User1 is not in member group
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        title: 'taskGroup1',
        description: 'taskGroupDesc1',
        priority: 8,
        severity: 6,
        groups: [ MEMBER_GROUP_NAME ],
      });
      // This should not be listend by User1 as it fails the input filter
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        title: 'taskGroup2',
        description: 'taskGroupDesc2',
        priority: 1,
        severity: 1,
        groups: [ INSTRUCTOR_GROUP_NAME, MEMBER_GROUP_NAME ],
      });
      // This should be listend by User1
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        title: 'taskGroup3',
        description: 'taskGroupDesc3',
        priority: 8,
        severity: 7,
        groups: [ INSTRUCTOR_GROUP_NAME, MEMBER_GROUP_NAME ],
      });
      // Validate the result. Will throw error if there is no data received within timeout or wrong result is listened
      const result = await withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTaskGroup Subscription timed out', () => {
        subscription?.unsubscribe();
      }) as any;
      expect(result.title).toEqual('taskGroup3');
      expect(result.description).toEqual('taskGroupDesc3');
      expect(result.priority).toEqual(8);
      expect(result.severity).toEqual(7);
    });
    test('Filter with update mutation', async () => {
      reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
      await Auth.signIn(USERNAME1, REAL_PASSWORD);
      const observer = API.graphql({
        // @ts-ignore
        query: gql`
          subscription OnUpdateTaskGroup(
            $filter: ModelSubscriptionTaskGroupFilterInput
          ) {
            onUpdateTaskGroup(filter: $filter) {
              id
              title
              description
              priority
              severity
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
        variables:{
          filter: {
            or: [
              { priority: { lt: 5 } },
              { severity: { lt: 5 } }
            ],
          },
        },
      }) as unknown as Observable<any>;
      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, reject) => {
        subscription = observer.subscribe(
          (event) => {
            // will unsubscribe on the first available subscription data
            const task = event.value.data.onUpdateTaskGroup;
            subscription.unsubscribe();
            resolve(task);
          },
          (err) => {
            reject(err);
          }
        );
      });
      // Wait for a time period for subscription to be setup
      await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-group-01',
        title: 'taskGroup1',
        description: 'taskGroupDesc1',
        priority: 8,
        severity: 6,
        groups: [ MEMBER_GROUP_NAME ],
      });
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-group-02',
        title: 'taskGroup2',
        description: 'taskGroupDesc2',
        priority: 1,
        severity: 1,
        groups: [ INSTRUCTOR_GROUP_NAME, MEMBER_GROUP_NAME ],
      });
      // This should not be listened by User1 as User1 is not in member group
      await updateTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-group-01',
        title: 'taskGroup1-updated',
        description: 'taskGroupDesc1-updated',
        priority: 7,
        severity: 2,
      });
      // This should be listened by User1 as User1 is in instructor group
      await updateTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-group-02',
        title: 'taskGroup2-updated',
        description: 'taskGroupDesc2-updated',
        priority: 3,
        severity: 7,
      });
      // Validate the result. Will throw error if there is no data received within timeout or wrong result is listened
      const result = await withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTaskGroup Subscription timed out', () => {
        subscription?.unsubscribe();
      }) as any;
      expect(result.id).toEqual('task-group-02');
      expect(result.title).toEqual('taskGroup2-updated');
      expect(result.description).toEqual('taskGroupDesc2-updated');
      expect(result.priority).toEqual(3);
      expect(result.severity).toEqual(7);
    });
    test('Filter with delete mutation', async () => {
      reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
      await Auth.signIn(USERNAME1, REAL_PASSWORD);
      const observer = API.graphql({
        // @ts-ignore
        query: gql`
          subscription OnDeleteTaskGroup(
            $filter: ModelSubscriptionTaskGroupFilterInput
          ) {
            onDeleteTaskGroup(filter: $filter) {
              id
              title
              description
              priority
              severity
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
        variables:{
          filter: {
            severity: { eq: 10 },
          },
        },
      }) as unknown as Observable<any>;
      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, reject) => {
        subscription = observer.subscribe(
          (event) => {
            // will unsubscribe on the first available subscription data
            const task = event.value.data.onDeleteTaskGroup;
            subscription.unsubscribe();
            resolve(task);
          },
          (err) => {
            reject(err);
          }
        );
      });
      // Wait for a time period for subscription to be setup
      await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-group-03',
        title: 'taskGroup3',
        description: 'taskGroupDesc3',
        priority: 6,
        severity: 10,
        groups: [ MEMBER_GROUP_NAME ],
      });
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-group-04',
        title: 'taskGroup4',
        description: 'taskGroupDesc4',
        priority: 3,
        severity: 10,
        groups: [ INSTRUCTOR_GROUP_NAME, MEMBER_GROUP_NAME ],
      });
      // This should not be listened by User1 as User1 is not in member group
      await deleteTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-group-03',
      });
      // This should be listened by User1 as User1 is in instructor group
      await deleteTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-group-04',
      });
      // Validate the result. Will throw error if there is no data received within timeout or wrong result is listened
      const result = await withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTaskGroup Subscription timed out', () => {
        subscription?.unsubscribe();
      }) as any;
      expect(result.id).toEqual('task-group-04');
      expect(result.title).toEqual('taskGroup4');
      expect(result.description).toEqual('taskGroupDesc4');
      expect(result.priority).toEqual(3);
      expect(result.severity).toEqual(10);
    });
  });
  describe('Single group test', () => {
    test('Filter with create mutation', async () => {
      reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
      await Auth.signIn(USERNAME1, REAL_PASSWORD);
      const observer = API.graphql({
        // @ts-ignore
        query: gql`
          subscription OnCreateTaskGroup(
            $filter: ModelSubscriptionTaskGroupFilterInput
          ) {
            onCreateTaskGroup(filter: $filter) {
              id
              title
              description
              priority
              severity
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
        variables:{
          filter: {
            and: [
              { priority: { eq: 8 } },
              { severity: { gt: 5 } },
            ]
          },
        },
      }) as unknown as Observable<any>;
      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, reject) => {
        subscription = observer.subscribe(
          (event) => {
            // will unsubscribe on the first available subscription data
            const task = event.value.data.onCreateTaskGroup;
            subscription.unsubscribe();
            resolve(task);
          },
          (err) => {
            reject(err);
          }
        );
      });
      // Wait for a time period for subscription to be setup
      await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));
      // This should not be listened by User1 as User1 is not in member group
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        title: 'taskGroup1',
        description: 'taskGroupDesc1',
        priority: 8,
        severity: 6,
        singleGroup: MEMBER_GROUP_NAME,
      });
      // This should not be listend by User1 as it fails the input filter
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        title: 'taskGroup2',
        description: 'taskGroupDesc2',
        priority: 1,
        severity: 1,
        singleGroup: INSTRUCTOR_GROUP_NAME,
      });
      // This should be listend by User1
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        title: 'taskGroup3',
        description: 'taskGroupDesc3',
        priority: 8,
        severity: 7,
        singleGroup: INSTRUCTOR_GROUP_NAME,
      });
      // Validate the result. Will throw error if there is no data received within timeout or wrong result is listened
      const result = await withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTaskGroup Subscription timed out', () => {
        subscription?.unsubscribe();
      }) as any;
      expect(result.title).toEqual('taskGroup3');
      expect(result.description).toEqual('taskGroupDesc3');
      expect(result.priority).toEqual(8);
      expect(result.severity).toEqual(7);
    });
    test('Filter with update mutation', async () => {
      reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
      await Auth.signIn(USERNAME1, REAL_PASSWORD);
      const observer = API.graphql({
        // @ts-ignore
        query: gql`
          subscription OnUpdateTaskGroup(
            $filter: ModelSubscriptionTaskGroupFilterInput
          ) {
            onUpdateTaskGroup(filter: $filter) {
              id
              title
              description
              priority
              severity
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
        variables:{
          filter: {
            or: [
              { priority: { lt: 5 } },
              { severity: { lt: 5 } }
            ],
          },
        },
      }) as unknown as Observable<any>;
      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, reject) => {
        subscription = observer.subscribe(
          (event) => {
            // will unsubscribe on the first available subscription data
            const task = event.value.data.onUpdateTaskGroup;
            subscription.unsubscribe();
            resolve(task);
          },
          (err) => {
            reject(err);
          }
        );
      });
      // Wait for a time period for subscription to be setup
      await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-single-group-01',
        title: 'taskGroup1',
        description: 'taskGroupDesc1',
        priority: 8,
        severity: 6,
        singleGroup: MEMBER_GROUP_NAME,
      });
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-single-group-02',
        title: 'taskGroup2',
        description: 'taskGroupDesc2',
        priority: 1,
        severity: 1,
        singleGroup: INSTRUCTOR_GROUP_NAME,
      });
      // This should not be listened by User1 as User1 is not in member group
      await updateTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-single-group-01',
        title: 'taskGroup1-updated',
        description: 'taskGroupDesc1-updated',
        priority: 7,
        severity: 2,
      });
      // This should be listened by User1 as User1 is in instructor group
      await updateTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-single-group-02',
        title: 'taskGroup2-updated',
        description: 'taskGroupDesc2-updated',
        priority: 3,
        severity: 7,
      });
      // Validate the result. Will throw error if there is no data received within timeout or wrong result is listened
      const result = await withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTaskGroup Subscription timed out', () => {
        subscription?.unsubscribe();
      }) as any;
      expect(result.id).toEqual('task-single-group-02');
      expect(result.title).toEqual('taskGroup2-updated');
      expect(result.description).toEqual('taskGroupDesc2-updated');
      expect(result.priority).toEqual(3);
      expect(result.severity).toEqual(7);
    });
    test('Filter with delete mutation', async () => {
      reconfigureAmplifyAPI('AMAZON_COGNITO_USER_POOLS');
      await Auth.signIn(USERNAME1, REAL_PASSWORD);
      const observer = API.graphql({
        // @ts-ignore
        query: gql`
          subscription OnDeleteTaskGroup(
            $filter: ModelSubscriptionTaskGroupFilterInput
          ) {
            onDeleteTaskGroup(filter: $filter) {
              id
              title
              description
              priority
              severity
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AMAZON_COGNITO_USER_POOLS,
        variables:{
          filter: {
            severity: { eq: 10 },
          },
        },
      }) as unknown as Observable<any>;
      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, reject) => {
        subscription = observer.subscribe(
          (event) => {
            // will unsubscribe on the first available subscription data
            const task = event.value.data.onDeleteTaskGroup;
            subscription.unsubscribe();
            resolve(task);
          },
          (err) => {
            reject(err);
          }
        );
      });
      // Wait for a time period for subscription to be setup
      await new Promise(res => setTimeout(res, SUBSCRIPTION_DELAY));
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-single-group-03',
        title: 'taskGroup3',
        description: 'taskGroupDesc3',
        priority: 6,
        severity: 10,
        singleGroup: MEMBER_GROUP_NAME,
      });
      await createTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-single-group-04',
        title: 'taskGroup4',
        description: 'taskGroupDesc4',
        priority: 3,
        severity: 10,
        singleGroup: INSTRUCTOR_GROUP_NAME,
      });
      // This should not be listened by User1 as User1 is not in member group
      await deleteTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-single-group-03',
      });
      // This should be listened by User1 as User1 is in instructor group
      await deleteTaskGroup(GRAPHQL_CLIENT_2, {
        id: 'task-single-group-04',
      });
      // Validate the result. Will throw error if there is no data received within timeout or wrong result is listened
      const result = await withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateTaskGroup Subscription timed out', () => {
        subscription?.unsubscribe();
      }) as any;
      expect(result.id).toEqual('task-single-group-04');
      expect(result.title).toEqual('taskGroup4');
      expect(result.description).toEqual('taskGroupDesc4');
      expect(result.priority).toEqual(3);
      expect(result.severity).toEqual(10);
    });
  });

});

// mutations
const createTask = async (client: AWSAppSyncClient<any>, input: CreateTaskInput): Promise<any> => {
  const request = gql`
    mutation CreateTask($input: CreateTaskInput!) {
      createTask(input: $input) {
        id
        title
        description
        priority
        severity
        owner
        readOwners
      }
    }
  `;
  return client.mutate<any>({ mutation: request, variables: { input } });
};

const updateTask = async (client: AWSAppSyncClient<any>, input: UpdateTaskInput): Promise<any> => {
  const request = gql`
    mutation UpdateTask($input: UpdateTaskInput!) {
      updateTask(input: $input) {
        id
        title
        description
        priority
        severity
        owner
        readOwners
      }
    }
  `;
  return client.mutate<any>({ mutation: request, variables: { input } });
};

const deleteTask = async (client: AWSAppSyncClient<any>, input: DeleteTaskInput): Promise<any> => {
  const request = gql`
    mutation DeleteTask($input: DeleteTaskInput!) {
      deleteTask(input: $input) {
        id
        title
        description
        priority
        severity
        owner
        readOwners
      }
    }
  `;
  return client.mutate<any>({ mutation: request, variables: { input } });
};

const createTodo = async (client: AWSAppSyncClient<any>, input: CreateTodoInput): Promise<any> => {
  const request = gql`
    mutation CreateTodo($input: CreateTodoInput!) {
      createTodo(input: $input) {
        id
        name
        description
        level
        owner
        sharedOwners
        status
      }
    }
  `;
  return client.mutate<any>({ mutation: request, variables: { input } });
};

const updateTodo = async (client: AWSAppSyncClient<any>, input: UpdateTodoInput): Promise<any> => {
  const request = gql`
    mutation UpdateTodo($input: UpdateTodoInput!) {
      updateTodo(input: $input) {
        id
        name
        description
        level
        owner
        sharedOwners
        status
      }
    }
  `;
  return client.mutate<any>({ mutation: request, variables: { input } });
};

const deleteTodo = async (client: AWSAppSyncClient<any>, input: DeleteTodoInput): Promise<any> => {
  const request = gql`
    mutation DeleteTodo($input: DeleteTodoInput!) {
      deleteTodo(input: $input) {
        id
        name
        description
        level
        owner
        sharedOwners
        status
      }
    }
  `;
  return client.mutate<any>({ mutation: request, variables: { input } });
};

const createTaskGroup = async (client: AWSAppSyncClient<any>, input: CreateTaskGroupInput): Promise<any> => {
  const request = gql`
    mutation CreateTaskGroup($input: CreateTaskGroupInput!) {
      createTaskGroup(input: $input) {
        id
        title
        description
        priority
        severity
        groups
        singleGroup
      }
    }
  `;
  return client.mutate<any>({ mutation: request, variables: { input } });
};

const updateTaskGroup = async (client: AWSAppSyncClient<any>, input: UpdateTaskGroupInput): Promise<any> => {
  const request = gql`
    mutation UpdateTaskGroup($input: UpdateTaskGroupInput!) {
      updateTaskGroup(input: $input) {
        id
        title
        description
        priority
        severity
        groups
        singleGroup
      }
    }
  `;
  return client.mutate<any>({ mutation: request, variables: { input } });
};

const deleteTaskGroup = async (client: AWSAppSyncClient<any>, input: DeleteTaskGroupInput): Promise<any> => {
  const request = gql`
    mutation DeleteTaskGroup($input: DeleteTaskGroupInput!) {
      deleteTaskGroup(input: $input) {
        id
        title
        description
        priority
        severity
        groups
        singleGroup
      }
    }
  `;
  return client.mutate<any>({ mutation: request, variables: { input } });
};

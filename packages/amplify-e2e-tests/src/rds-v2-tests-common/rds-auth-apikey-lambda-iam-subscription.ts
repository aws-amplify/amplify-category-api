import {
  addApiWithAllAuthModes,
  amplifyPush,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  setupRDSInstanceAndData,
  sleep,
  enableUserPoolUnauthenticatedAccess,
  apiGqlCompile,
} from 'amplify-category-api-e2e-core';
import { existsSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import gql from 'graphql-tag';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import { GRAPHQL_AUTH_MODE } from '@aws-amplify/api';
import * as Observable from 'zen-observable';
import {
  configureAmplify,
  getConfiguredAppsyncClientIAMAuth,
  setupUser,
  signInUser,
  getConfiguredAppsyncClientAPIKeyAuth,
  getConfiguredAppsyncClientLambdaAuth,
} from '../schema-api-directives';
import { Auth, API } from 'aws-amplify';
import { getUserPoolId } from '../schema-api-directives/authHelper';
import { reconfigureAmplifyAPI, withTimeOut } from '../utils/api';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';
import { getDefaultDatabasePort } from '../rds-v2-test-utils';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');
// to deal with subscriptions in node env
(global as any).WebSocket = require('ws');

// delay times
const SUBSCRIPTION_DELAY = 10000;
const SUBSCRIPTION_TIMEOUT = 10000;

export const testApiKeyLambdaIamAuthSubscription = (engine: ImportedRDSType, queries: string[]): void => {
  describe('RDS Relational Directives', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'us-east-1';
    let port = getDefaultDatabasePort(engine);
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const engineSuffix = engine === ImportedRDSType.MYSQL ? 'mysql' : 'pg';
    const projName = `${engineSuffix}modelauth1`;
    const apiName = projName;

    let projRoot;
    let blogIAMUnauthClient, postIAMUnauthClient, userIAMUnauthClient, profileIAMUnauthClient;
    let blogIAMAuthClient, postIAMAuthClient, userIAMAuthClient, profileIAMAuthClient;
    let userApiKeyClient;
    let userLambdaClient;
    let apiEndPoint;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projName);
      await initProjectAndImportSchema();
      await amplifyPush(projRoot, false, {
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });

      await apiGqlCompile(projRoot, false, {
        forceCompile: true,
      });
      await amplifyPush(projRoot, false, {
        skipCodegen: true,
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
      await sleep(2 * 60 * 1000); // Wait for a minute for the VPC endpoints to be live.

      const meta = getProjectMeta(projRoot);
      const appRegion = meta.providers.awscloudformation.Region;
      const { output } = meta.api[apiName];
      const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
      const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, appRegion);

      expect(GraphQLAPIIdOutput).toBeDefined();
      expect(GraphQLAPIEndpointOutput).toBeDefined();
      expect(GraphQLAPIKeyOutput).toBeDefined();

      expect(graphqlApi).toBeDefined();
      expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

      apiEndPoint = GraphQLAPIEndpointOutput as string;
      const apiKey = GraphQLAPIKeyOutput as string;

      await createAppSyncClients(appRegion, apiKey);
    });

    const createAppSyncClients = async (appRegion, apiKey): Promise<void> => {
      configureAmplify(projRoot);
      const unAuthCredentials = await Auth.currentCredentials();
      const [cognito_username, cognito_password] = ['test@test.com', 'Password123!'];
      const userPoolId = getUserPoolId(projRoot);
      await setupUser(userPoolId, cognito_username, cognito_password);

      await sleep(30 * 1000); // Wait for 30 seconds for the user to be available in Cognito.
      await signInUser(cognito_username, cognito_password);
      const authCredentials = await Auth.currentCredentials();

      const unauthAppSyncClient = getConfiguredAppsyncClientIAMAuth(apiEndPoint, appRegion, unAuthCredentials);
      const authAppSyncClient = getConfiguredAppsyncClientIAMAuth(apiEndPoint, appRegion, authCredentials);
      const apiKeyClient = getConfiguredAppsyncClientAPIKeyAuth(apiEndPoint, appRegion, apiKey);
      const lambdaClient = getConfiguredAppsyncClientLambdaAuth(apiEndPoint, appRegion, 'custom-authorized');

      blogIAMUnauthClient = constructBlogHelper(unauthAppSyncClient);
      postIAMUnauthClient = constructPostHelper(unauthAppSyncClient);
      userIAMUnauthClient = constructUserHelper(unauthAppSyncClient);
      profileIAMUnauthClient = constructProfileHelper(unauthAppSyncClient);
      blogIAMAuthClient = constructBlogHelper(authAppSyncClient);
      postIAMAuthClient = constructPostHelper(authAppSyncClient);
      userIAMAuthClient = constructUserHelper(authAppSyncClient);
      profileIAMAuthClient = constructProfileHelper(authAppSyncClient);
      userApiKeyClient = constructUserHelper(apiKeyClient);
      userLambdaClient = constructUserHelper(lambdaClient);
    };

    afterAll(async () => {
      const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
      if (existsSync(metaFilePath)) {
        await deleteProject(projRoot);
      }
      deleteProjectDir(projRoot);
      await cleanupDatabase();
    });

    const setupDatabase = async (): Promise<void> => {
      const dbConfig = {
        identifier,
        engine: engine === ImportedRDSType.MYSQL ? ('mysql' as const) : ('postgres' as const),
        dbname: database,
        username,
        password,
        region,
      };

      const db = await setupRDSInstanceAndData(dbConfig, queries);
      port = db.port;
      host = db.endpoint;
    };

    const cleanupDatabase = async (): Promise<void> => {
      await deleteDBInstance(identifier, region);
    };

    const initProjectAndImportSchema = async (): Promise<void> => {
      await initJSProjectWithProfile(projRoot, {
        disableAmplifyAppCreation: false,
        name: projName,
      });

      const metaAfterInit = getProjectMeta(projRoot);
      region = metaAfterInit.providers.awscloudformation.Region;
      await setupDatabase();

      const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');

      await addApiWithAllAuthModes(projRoot, { transformerVersion: 2, apiName });
      await enableUserPoolUnauthenticatedAccess(projRoot);

      await importRDSDatabase(projRoot, {
        database,
        engine,
        host,
        port,
        username,
        password,
        useVpc: true,
        apiExists: true,
      });

      const schema = /* GraphQL */ `
        input AMPLIFY {
          engine: String = "${engine}"
          globalAuthRule: AuthRule = { allow: public }
        }
        type Blog @model @auth(rules: [{ allow: private, provider: iam }]) {
          id: String! @primaryKey
          content: String
          posts: [Post] @hasMany(references: ["blogId"])
        }
        type Post @model @auth(rules: [{ allow: private, provider: iam }]) {
          id: String! @primaryKey
          content: String
          blogId: String!
          blog: Blog @belongsTo(references: ["blogId"])
        }
        type User @model @auth(rules: [{ allow: public, provider: iam }, { allow: custom }]) {
          id: String! @primaryKey
          name: String
          profile: Profile @hasOne(references: ["userId"])
        }
        type Profile @model @auth(rules: [{ allow: public, provider: iam }, { allow: custom }]) {
          id: String! @primaryKey
          details: String
          userId: String!
          user: User @belongsTo(references: ["userId"])
        }
      `;
      writeFileSync(rdsSchemaFilePath, schema, 'utf8');
    };

    test('check iam private auth can subscribe to oncreate event on blog', async () => {
      reconfigureAmplifyAPI(apiEndPoint, region, 'AWS_IAM');

      // Check onCreate subscription
      const observer = API.graphql({
        query: gql`
          subscription OnCreateBlog {
            onCreateBlog {
              id
              content
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AWS_IAM,
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const blog = event.value.data.onCreateBlog;
            subscription.unsubscribe();
            expect(blog).toBeDefined();
            expect(blog).toEqual(
              expect.objectContaining({
                id: 'B-1',
                content: 'Blog 1',
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('IAM client should be able to subscribe on blog');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await blogIAMAuthClient.create('createBlog', {
        id: 'B-1',
        content: 'Blog 1',
      });

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateBlog Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('check iam private auth can subscribe to oncreate event on blog with runtime filter', async () => {
      reconfigureAmplifyAPI(apiEndPoint, region, 'AWS_IAM');

      // Check onCreate subscription
      const observer = API.graphql({
        query: gql`
          subscription OnCreateBlog($filter: ModelSubscriptionBlogFilterInput) {
            onCreateBlog(filter: $filter) {
              id
              content
            }
          }
        `,
        variables: {
          filter: {
            content: {
              eq: 'Blog 3',
            },
          },
        },
        authMode: GRAPHQL_AUTH_MODE.AWS_IAM,
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const blog = event.value.data.onCreateBlog;
            subscription.unsubscribe();
            expect(blog).toBeDefined();
            expect(blog).toEqual(
              expect.objectContaining({
                id: 'B-3',
                content: 'Blog 3',
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('IAM client should be able to subscribe on blog');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await blogIAMAuthClient.create('createBlog', {
        id: 'B-2',
        content: 'Blog 2',
      });

      await blogIAMAuthClient.create('createBlog', {
        id: 'B-3',
        content: 'Blog 3',
      });

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateBlog Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('check iam private auth can subscribe to onupdate event on blog', async () => {
      reconfigureAmplifyAPI(apiEndPoint, region, 'AWS_IAM');

      // Check onUpdate subscription
      const observer = API.graphql({
        query: gql`
          subscription OnUpdateBlog {
            onUpdateBlog {
              id
              content
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AWS_IAM,
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const blog = event.value.data.onUpdateBlog;
            subscription.unsubscribe();
            expect(blog).toBeDefined();
            expect(blog).toEqual(
              expect.objectContaining({
                id: 'B-1',
                content: 'Blog 1 - Updated',
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('IAM client should be able to subscribe on blog');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await blogIAMAuthClient.update('updateBlog', {
        id: 'B-1',
        content: 'Blog 1 - Updated',
      });

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnUpdateBlog Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('check iam private auth can subscribe to ondelete event on blog', async () => {
      reconfigureAmplifyAPI(apiEndPoint, region, 'AWS_IAM');

      // Check onDelete subscription
      const observer = API.graphql({
        query: gql`
          subscription OnDeleteBlog {
            onDeleteBlog {
              id
              content
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AWS_IAM,
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const blog = event.value.data.onDeleteBlog;
            subscription.unsubscribe();
            expect(blog).toBeDefined();
            expect(blog).toEqual(
              expect.objectContaining({
                id: 'B-1',
                content: 'Blog 1 - Updated',
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('IAM client should be able to subscribe on blog');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await blogIAMAuthClient.delete('deleteBlog', {
        id: 'B-1',
      });

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnDeleteBlog Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('check api key should not be able to subscribe on blog', async () => {
      const observer = API.graphql({
        query: gql`
          subscription OnCreateBlog {
            onCreateBlog {
              id
              content
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.API_KEY,
      }) as unknown as Observable<any>;
      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            throw new Error('Should not have received any event');
            resolve(undefined);
          },
          (err) => {
            expect(err.error.errors[0].message).toEqual(
              expect.stringContaining('Not Authorized to access onCreateBlog on type Subscription'),
            );
            resolve(undefined);
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateBlog Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('check lambda auth can subscribe to oncreate event on user', async () => {
      reconfigureAmplifyAPI(apiEndPoint, region, 'AWS_LAMBDA');

      // Check onCreate subscription
      const observer = API.graphql({
        query: gql`
          subscription OnCreateUser {
            onCreateUser {
              id
              name
            }
          }
        `,
        authMode: GRAPHQL_AUTH_MODE.AWS_LAMBDA,
        authToken: 'custom-authorized',
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const user = event.value.data.onCreateUser;
            subscription.unsubscribe();
            expect(user).toBeDefined();
            expect(user).toEqual(
              expect.objectContaining({
                id: 'U-1',
                name: 'User 1',
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('Lambda client should be able to subscribe on user');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await userLambdaClient.create('createUser', {
        id: 'U-1',
        name: 'User 1',
      });

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateUser Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('check lambda auth can subscribe to oncreate event on user with runtime filter', async () => {
      reconfigureAmplifyAPI(apiEndPoint, region, 'AWS_LAMBDA');

      // Check onCreate subscription
      const observer = API.graphql({
        query: gql`
          subscription OnCreateUser($filter: ModelSubscriptionUserFilterInput) {
            onCreateUser(filter: $filter) {
              id
              name
            }
          }
        `,
        variables: {
          filter: {
            name: {
              eq: 'User 3',
            },
          },
        },
        authMode: GRAPHQL_AUTH_MODE.AWS_LAMBDA,
        authToken: 'custom-authorized',
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const user = event.value.data.onCreateUser;
            subscription.unsubscribe();
            expect(user).toBeDefined();
            expect(user).toEqual(
              expect.objectContaining({
                id: 'U-3',
                name: 'User 3',
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('Lambda client should be able to subscribe on user');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await userLambdaClient.create('createUser', {
        id: 'U-2',
        name: 'User 2',
      });

      await userLambdaClient.create('createUser', {
        id: 'U-3',
        name: 'User 3',
      });

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnCreateUser Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('check lambda auth can subscribe to onupdate event on user with runtime filter', async () => {
      reconfigureAmplifyAPI(apiEndPoint, region, 'AWS_LAMBDA');

      // Check onUpdate subscription
      const observer = API.graphql({
        query: gql`
          subscription OnUpdateUser($filter: ModelSubscriptionUserFilterInput) {
            onUpdateUser(filter: $filter) {
              id
              name
            }
          }
        `,
        variables: {
          filter: {
            name: {
              eq: 'User 3 - Updated',
            },
          },
        },
        authMode: GRAPHQL_AUTH_MODE.AWS_LAMBDA,
        authToken: 'custom-authorized',
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const user = event.value.data.onUpdateUser;
            subscription.unsubscribe();
            expect(user).toBeDefined();
            expect(user).toEqual(
              expect.objectContaining({
                id: 'U-3',
                name: 'User 3 - Updated',
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('Lambda client should be able to subscribe on user');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await userLambdaClient.update('updateUser', {
        id: 'U-2',
        name: 'User 2 - Updated',
      });

      await userLambdaClient.update('updateUser', {
        id: 'U-3',
        name: 'User 3 - Updated',
      });

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnUpdateUser Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    test('check lambda auth can subscribe to ondelete event on user with runtime filter', async () => {
      reconfigureAmplifyAPI(apiEndPoint, region, 'AWS_LAMBDA');

      // Check onDelete subscription
      const observer = API.graphql({
        query: gql`
          subscription OnDeleteUser($filter: ModelSubscriptionUserFilterInput) {
            onDeleteUser(filter: $filter) {
              id
              name
            }
          }
        `,
        variables: {
          filter: {
            name: {
              eq: 'User 3 - Updated',
            },
          },
        },
        authMode: GRAPHQL_AUTH_MODE.AWS_LAMBDA,
        authToken: 'custom-authorized',
      }) as unknown as Observable<any>;

      let subscription: ZenObservable.Subscription;
      const subscriptionPromise = new Promise((resolve, _) => {
        subscription = observer.subscribe(
          (event: any) => {
            const user = event.value.data.onDeleteUser;
            subscription.unsubscribe();
            expect(user).toBeDefined();
            expect(user).toEqual(
              expect.objectContaining({
                id: 'U-3',
                name: 'User 3 - Updated',
              }),
            );
            resolve(undefined);
          },
          (err) => {
            console.log(JSON.stringify(err.error.errors, null, 4));
            throw new Error('Lambda client should be able to subscribe on user');
          },
        );
      });

      await new Promise((res) => setTimeout(res, SUBSCRIPTION_DELAY));

      await userLambdaClient.delete('deleteUser', {
        id: 'U-2',
      });

      await userLambdaClient.delete('deleteUser', {
        id: 'U-3',
      });

      return withTimeOut(subscriptionPromise, SUBSCRIPTION_TIMEOUT, 'OnDeleteUser Subscription timed out', () => {
        subscription?.unsubscribe();
      });
    });

    const constructBlogHelper = (client): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
        id
        content
      `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetBlog($id: String!) {
          getBlog(id: $id) {
            id
            content
            posts {
              items {
                id
                content
              }
            }
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query ListBlogs {
          listBlogs {
            items {
              id
              content
              posts {
                items {
                  id
                  content
                }
              }
            }
          }
        }
      `;
      const helper = new GQLQueryHelper(client, 'Blog', {
        mutation: {
          create: createSelectionSet,
          update: updateSelectionSet,
          delete: deleteSelectionSet,
        },
        query: {
          get: getSelectionSet,
          list: listSelectionSet,
        },
      });

      return helper;
    };

    const constructPostHelper = (client): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
        id
        content
      `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetPost($id: String!) {
          getPost(id: $id) {
            id
            content
            blog {
              id
              content
            }
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query ListPosts {
          listPosts {
            items {
              id
              content
              blog {
                id
                content
              }
            }
          }
        }
      `;
      const helper = new GQLQueryHelper(client, 'Post', {
        mutation: {
          create: createSelectionSet,
          update: updateSelectionSet,
          delete: deleteSelectionSet,
        },
        query: {
          get: getSelectionSet,
          list: listSelectionSet,
        },
      });

      return helper;
    };

    const constructUserHelper = (client): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
        id
        name
      `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetUser($id: String!) {
          getUser(id: $id) {
            id
            name
            profile {
              id
              details
            }
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query ListUsers {
          listUsers {
            items {
              id
              name
              profile {
                id
                details
              }
            }
          }
        }
      `;
      const helper = new GQLQueryHelper(client, 'User', {
        mutation: {
          create: createSelectionSet,
          update: updateSelectionSet,
          delete: deleteSelectionSet,
        },
        query: {
          get: getSelectionSet,
          list: listSelectionSet,
        },
      });

      return helper;
    };

    const constructProfileHelper = (client): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
        id
        details
      `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetProfile($id: String!) {
          getProfile(id: $id) {
            id
            details
            user {
              id
              name
            }
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query ListProfiles {
          listProfiles {
            items {
              id
              details
              user {
                id
                name
              }
            }
          }
        }
      `;
      const helper = new GQLQueryHelper(client, 'Profile', {
        mutation: {
          create: createSelectionSet,
          update: updateSelectionSet,
          delete: deleteSelectionSet,
        },
        query: {
          get: getSelectionSet,
          list: listSelectionSet,
        },
      });

      return helper;
    };
  });
};

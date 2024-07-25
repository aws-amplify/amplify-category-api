import path from 'path';
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
} from 'amplify-category-api-e2e-core';
import { existsSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import { Auth } from 'aws-amplify';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import {
  configureAmplify,
  getConfiguredAppsyncClientIAMAuth,
  setupUser,
  signInUser,
  getConfiguredAppsyncClientAPIKeyAuth,
  getConfiguredAppsyncClientLambdaAuth,
} from '../schema-api-directives';
import { getUserPoolId } from '../schema-api-directives/authHelper';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

export const testRdsIamAuth = (engine: ImportedRDSType, queries: string[]): void => {
  describe('RDS Relational Directives', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'ap-northeast-2';
    let port = 3306;
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const engineSuffix = engine === ImportedRDSType.MYSQL ? 'mysql' : 'pg';
    const engineName = engine === ImportedRDSType.MYSQL ? 'mysql' : 'postgres';
    const projName = `${engineSuffix}modelauth3`;
    const apiName = projName;

    let projRoot;
    let blogIAMUnauthClient, postIAMUnauthClient, userIAMUnauthClient, profileIAMUnauthClient;
    let blogIAMAuthClient, postIAMAuthClient, userIAMAuthClient, profileIAMAuthClient;
    let userApiKeyClient;
    let userLambdaClient;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projName);
      await initProjectAndImportSchema();

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

      const apiEndPoint = GraphQLAPIEndpointOutput as string;
      const apiKey = GraphQLAPIKeyOutput as string;

      await createAppSyncClients(apiEndPoint, appRegion, apiKey);
    });

    const createAppSyncClients = async (apiEndPoint, appRegion, apiKey): Promise<void> => {
      configureAmplify(projRoot);
      const unAuthCredentials = await Auth.currentCredentials();
      const [cognito_username, cognito_password] = ['test@test.com', 'Password123!'];
      const userPoolId = getUserPoolId(projRoot);
      await setupUser(userPoolId, cognito_username, cognito_password);
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
      await amplifyPush(projRoot, false, {
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });

      const schema = /* GraphQL */ `
        input AMPLIFY {
          engine: String = "${engineName}"
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

      // Enable unauthenticated access to the Cognito resource and push again
      await enableUserPoolUnauthenticatedAccess(projRoot);
      await amplifyPush(projRoot, false, {
        skipCodegen: true,
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
    };

    test('check iam private auth can perform all valid operations on blog', async () => {
      await blogIAMAuthClient.create('createBlog', {
        id: 'B-1',
        content: 'Blog 1',
      });
      await blogIAMAuthClient.update('updateBlog', {
        id: 'B-1',
        content: 'Blog 1 updated',
      });
      const getBlogResult = await blogIAMAuthClient.get({
        id: 'B-1',
      });
      expect(getBlogResult.data.getBlog).toEqual(
        expect.objectContaining({
          id: 'B-1',
          content: 'Blog 1 updated',
        }),
      );
      const listBlogsResult = await blogIAMAuthClient.list();
      expect(listBlogsResult.data.listBlogs.items.length).toEqual(1);
      expect(listBlogsResult.data.listBlogs.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'B-1',
            content: 'Blog 1 updated',
          }),
        ]),
      );
      await blogIAMAuthClient.delete('deleteBlog', {
        id: 'B-1',
      });
    });

    test('check iam public auth can perform all valid operations on user', async () => {
      await userIAMUnauthClient.create('createUser', {
        id: 'U-1',
        name: 'User 1',
      });
      await userIAMUnauthClient.update('updateUser', {
        id: 'U-1',
        name: 'User 1 updated',
      });
      const getUserResult = await userIAMUnauthClient.get({
        id: 'U-1',
      });
      expect(getUserResult.data.getUser).toEqual(
        expect.objectContaining({
          id: 'U-1',
          name: 'User 1 updated',
        }),
      );
      const listUsersResult = await userIAMUnauthClient.list();
      expect(listUsersResult.data.listUsers.items.length).toEqual(1);
      expect(listUsersResult.data.listUsers.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'U-1',
            name: 'User 1 updated',
          }),
        ]),
      );
      await userIAMUnauthClient.delete('deleteUser', {
        id: 'U-1',
      });
    });

    test('on multi auth model - check lambda auth can perform all valid operations on user', async () => {
      await userLambdaClient.create('createUser', {
        id: 'U-2',
        name: 'User 2',
      });
      await userLambdaClient.update('updateUser', {
        id: 'U-2',
        name: 'User 2 updated',
      });
      const getUserResult = await userLambdaClient.get({
        id: 'U-2',
      });
      expect(getUserResult.data.getUser).toEqual(
        expect.objectContaining({
          id: 'U-2',
          name: 'User 2 updated',
        }),
      );
      const listUsersResult = await userLambdaClient.list();
      expect(listUsersResult.data.listUsers.items.length).toEqual(1);
      expect(listUsersResult.data.listUsers.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'U-2',
            name: 'User 2 updated',
          }),
        ]),
      );
      await userLambdaClient.delete('deleteUser', {
        id: 'U-2',
      });
    });

    test('check apikey auth can not perform any operation on user', async () => {
      await expect(userApiKeyClient.create('createUser', { id: 'U-1', name: 'User 1' })).rejects.toThrow(
        'GraphQL error: Not Authorized to access createUser on type Mutation',
      );
      await expect(userApiKeyClient.update('updateUser', { id: 'U-1', name: 'User 1 updated' })).rejects.toThrow(
        'GraphQL error: Not Authorized to access updateUser on type Mutation',
      );
      await expect(userApiKeyClient.get({ id: 'U-1' })).rejects.toThrow('GraphQL error: Not Authorized to access getUser on type Query');
      await expect(userApiKeyClient.list()).rejects.toThrow('GraphQL error: Not Authorized to access listUsers on type Query');
      await expect(userApiKeyClient.delete('deleteUser', { id: 'U-1' })).rejects.toThrow(
        'GraphQL error: Not Authorized to access deleteUser on type Mutation',
      );
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

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
} from 'amplify-category-api-e2e-core';
import { existsSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import { getConfiguredAppsyncClientAPIKeyAuth, getConfiguredAppsyncClientLambdaAuth } from '../schema-api-directives';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

export const testRdsApiKeyAndLambdaAuth = (engine: ImportedRDSType, queries: string[]): void => {
  describe('RDS Relational Directives', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'ap-northeast-2';
    let port = engine === ImportedRDSType.MYSQL ? 3306 : 5432;
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const engineSuffix = engine === ImportedRDSType.MYSQL ? 'mysql' : 'pg';
    const engineName = engine === ImportedRDSType.MYSQL ? 'mysql' : 'postgres';
    const projName = `${engineSuffix}modelauth2`;
    const apiName = projName;

    let projRoot;
    let blogApiKeyClient, postApiKeyClient, userApiKeyClient, profileApiKeyClient;
    let blogLambdaClient, postLambdaClient, userLambdaClient, profileLambdaClient;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projName);
      await initProjectAndImportSchema();
      await amplifyPush(projRoot, false, {
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
      await sleep(2 * 60 * 1000); // Wait for 2 minutes for the VPC endpoints to be live.

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

      createAppSyncClients(apiEndPoint, appRegion, apiKey);
    });

    const createAppSyncClients = (apiEndPoint, appRegion, apiKey): void => {
      const apiKeyClient = getConfiguredAppsyncClientAPIKeyAuth(apiEndPoint, appRegion, apiKey);
      const lambdaClient = getConfiguredAppsyncClientLambdaAuth(apiEndPoint, appRegion, 'custom-authorized');
      blogApiKeyClient = constructBlogHelper(apiKeyClient);
      postApiKeyClient = constructPostHelper(apiKeyClient);
      userApiKeyClient = constructUserHelper(apiKeyClient);
      profileApiKeyClient = constructProfileHelper(apiKeyClient);
      blogLambdaClient = constructBlogHelper(lambdaClient);
      postLambdaClient = constructPostHelper(lambdaClient);
      userLambdaClient = constructUserHelper(lambdaClient);
      profileLambdaClient = constructProfileHelper(lambdaClient);
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
        engine,
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

      const schema = /* GraphQL */ `
        input AMPLIFY {
          engine: String = "${engineName}"
          globalAuthRule: AuthRule = { allow: public }
        }
        type Blog @model @auth(rules: [{ allow: public }, { allow: custom }]) {
          id: String! @primaryKey
          content: String
          posts: [Post] @hasMany(references: ["blogId"])
        }
        type Post @model @auth(rules: [{ allow: public }]) {
          id: String! @primaryKey
          content: String
          blogId: String!
          blog: Blog @belongsTo(references: ["blogId"])
        }
        type User @model @auth(rules: [{ allow: custom }]) {
          id: String! @primaryKey
          name: String
          profile: Profile @hasOne(references: ["userId"])
        }
        type Profile @model @auth(rules: [{ allow: custom }]) {
          id: String! @primaryKey
          details: String
          userId: String!
          user: User @belongsTo(references: ["userId"])
        }
      `;
      writeFileSync(rdsSchemaFilePath, schema, 'utf8');
    };

    test('check apikey auth can perform all valid operations on blog', async () => {
      await blogApiKeyClient.create('createBlog', {
        id: 'B-1',
        content: 'Blog 1',
      });
      await blogApiKeyClient.update('updateBlog', {
        id: 'B-1',
        content: 'Blog 1 updated',
      });
      const getBlogResult = await blogApiKeyClient.get({
        id: 'B-1',
      });
      expect(getBlogResult.data.getBlog).toEqual(
        expect.objectContaining({
          id: 'B-1',
          content: 'Blog 1 updated',
        }),
      );
      const listBlogsResult = await blogApiKeyClient.list();
      expect(listBlogsResult.data.listBlogs.items.length).toEqual(1);
      expect(listBlogsResult.data.listBlogs.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'B-1',
            content: 'Blog 1 updated',
          }),
        ]),
      );
      await blogApiKeyClient.delete('deleteBlog', {
        id: 'B-1',
      });
    });

    test('check lambda auth can perform all valid operations on blog', async () => {
      await blogLambdaClient.create('createBlog', {
        id: 'B-2',
        content: 'Blog 2',
      });
      await blogLambdaClient.update('updateBlog', {
        id: 'B-2',
        content: 'Blog 2 updated',
      });
      await expect(
        blogLambdaClient.get({
          id: 'B-2',
        }),
      ).rejects.toThrow('GraphQL error: Not Authorized to access posts on type Blog');
      await expect(blogLambdaClient.list()).rejects.toThrow('GraphQL error: Not Authorized to access posts on type Blog');
      await blogLambdaClient.delete('deleteBlog', {
        id: 'B-2',
      });
    });

    test('check lambda auth can not perform any operation on post', async () => {
      await expect(postLambdaClient.create('createPost', { id: 'P-1', content: 'Post 1', blogId: 'B-1' })).rejects.toThrow(
        'GraphQL error: Not Authorized to access createPost on type Mutation',
      );
      await expect(postLambdaClient.update('updatePost', { id: 'P-1', content: 'Post 1 updated' })).rejects.toThrow(
        'GraphQL error: Not Authorized to access updatePost on type Mutation',
      );
      await expect(postLambdaClient.get({ id: 'P-1' })).rejects.toThrow('GraphQL error: Not Authorized to access getPost on type Query');
      await expect(postLambdaClient.list()).rejects.toThrow('GraphQL error: Not Authorized to access listPosts on type Query');
      await expect(postLambdaClient.delete('deletePost', { id: 'P-1' })).rejects.toThrow(
        'GraphQL error: Not Authorized to access deletePost on type Mutation',
      );
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

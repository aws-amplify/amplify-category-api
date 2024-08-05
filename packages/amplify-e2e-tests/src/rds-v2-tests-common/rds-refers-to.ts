import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import {
  addApiWithoutSchema,
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
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { existsSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

export const testRDSRefersTo = (engine: ImportedRDSType, queries: string[]) => {
  describe('RDS refersTo directive on models', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'us-east-1';
    let port = engine === ImportedRDSType.MYSQL ? 3306 : 5432;
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const engineSuffix = engine === ImportedRDSType.MYSQL ? 'mysql' : 'pg';
    const engineName = engine === ImportedRDSType.MYSQL ? 'mysql' : 'postgres';
    const projName = `${engineSuffix}refer1`;
    const apiName = projName;

    let projRoot;
    let appSyncClient;

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

      appSyncClient = new AWSAppSyncClient({
        url: apiEndPoint,
        region: appRegion,
        disableOffline: true,
        auth: {
          type: AUTH_TYPE.API_KEY,
          apiKey,
        },
      });
    });

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

      await addApiWithoutSchema(projRoot, { transformerVersion: 2, apiName });

      await importRDSDatabase(projRoot, {
        engine,
        database,
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
            type NewBlog @model @refersTo(name: "Blog") {
              id: String! @primaryKey
              content: String
              posts: [NewPost] @hasMany(references: ["blogId"])
            }
            type NewPost @model @refersTo(name: "Post") {
              id: String! @primaryKey
              content: String
              blogId: String!
              blog: NewBlog @belongsTo(references: ["blogId"])
            }
            type NewUser @model @refersTo(name: "User") {
              id: String! @primaryKey
              name: String
              profile: NewProfile @hasOne(references: ["userId"])
            }
            type NewProfile @model @refersTo(name: "Profile") {
              id: String! @primaryKey
              details: String
              userId: String!
              user: NewUser @belongsTo(references: ["userId"])
            }
            type NewTask @model @refersTo(name: "Task") {
              id: String! @primaryKey
              description: String
            }
          `;
      writeFileSync(rdsSchemaFilePath, schema, 'utf8');
    };

    test('check CRUD options on renamed model', async () => {
      const newTaskHelper = constructNewTaskHelper();

      await newTaskHelper.create('createNewTask', {
        id: 'T-1',
        description: 'Task 1',
      });
      await newTaskHelper.create('createNewTask', {
        id: 'T-2',
        description: 'Task 2',
      });

      const getNewTask1 = await newTaskHelper.get({
        id: 'T-1',
      });
      expect(getNewTask1.data.getNewTask.id).toEqual('T-1');
      expect(getNewTask1.data.getNewTask.description).toEqual('Task 1');

      const listNewTasks = await newTaskHelper.list();
      expect(listNewTasks.data.listNewTasks.items.length).toEqual(2);
      expect(listNewTasks.data.listNewTasks.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'T-1',
            description: 'Task 1',
          }),
          expect.objectContaining({
            id: 'T-2',
            description: 'Task 2',
          }),
        ]),
      );

      const updatedNewTask2 = await newTaskHelper.update('updateNewTask', {
        id: 'T-2',
        description: 'Task 2 Updated',
      });
      expect(updatedNewTask2.data.updateNewTask.id).toEqual('T-2');
      expect(updatedNewTask2.data.updateNewTask.description).toEqual('Task 2 Updated');

      const deletedNewTask2 = await newTaskHelper.delete('deleteNewTask', {
        id: 'T-2',
      });
      expect(deletedNewTask2.data.deleteNewTask.id).toEqual('T-2');
      expect(deletedNewTask2.data.deleteNewTask.description).toEqual('Task 2 Updated');
    });

    test('check hasMany and belongsTo directives on tables with name mappings', async () => {
      const newBlogHelper = constructNewBlogHelper();
      const newPostHelper = constructNewPostHelper();

      await newBlogHelper.create('createNewBlog', {
        id: 'B-1',
        content: 'Blog 1',
      });
      await newBlogHelper.create('createNewBlog', {
        id: 'B-2',
        content: 'Blog 2',
      });
      await newBlogHelper.create('createNewBlog', {
        id: 'B-3',
        content: 'Blog 3',
      });

      await newPostHelper.create('createNewPost', {
        id: 'P-1A',
        content: 'Post 1A',
        blogId: 'B-1',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-1B',
        content: 'Post 1B',
        blogId: 'B-1',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-1C',
        content: 'Post 1C',
        blogId: 'B-1',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-2A',
        content: 'Post 2A',
        blogId: 'B-2',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-2B',
        content: 'Post 2B',
        blogId: 'B-2',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-3A',
        content: 'Post 3A',
        blogId: 'B-3',
      });

      const getNewBlog1 = await newBlogHelper.get({
        id: 'B-1',
      });
      expect(getNewBlog1.data.getNewBlog.id).toEqual('B-1');
      expect(getNewBlog1.data.getNewBlog.content).toEqual('Blog 1');
      expect(getNewBlog1.data.getNewBlog.posts.items.length).toEqual(3);
      expect(getNewBlog1.data.getNewBlog.posts.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'P-1A', content: 'Post 1A' }),
          expect.objectContaining({ id: 'P-1B', content: 'Post 1B' }),
          expect.objectContaining({ id: 'P-1C', content: 'Post 1C' }),
        ]),
      );

      const getNewBlog2 = await newBlogHelper.get({
        id: 'B-2',
      });
      expect(getNewBlog2.data.getNewBlog.id).toEqual('B-2');
      expect(getNewBlog2.data.getNewBlog.content).toEqual('Blog 2');
      expect(getNewBlog2.data.getNewBlog.posts.items.length).toEqual(2);
      expect(getNewBlog2.data.getNewBlog.posts.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'P-2A', content: 'Post 2A' }),
          expect.objectContaining({ id: 'P-2B', content: 'Post 2B' }),
        ]),
      );

      const getNewBlog3 = await newBlogHelper.get({
        id: 'B-3',
      });
      expect(getNewBlog3.data.getNewBlog.id).toEqual('B-3');
      expect(getNewBlog3.data.getNewBlog.content).toEqual('Blog 3');
      expect(getNewBlog3.data.getNewBlog.posts.items.length).toEqual(1);
      expect(getNewBlog3.data.getNewBlog.posts.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'P-3A', content: 'Post 3A' })]),
      );

      const listNewBlogs = await newBlogHelper.list();
      expect(listNewBlogs.data.listNewBlogs.items.length).toEqual(3);
      expect(listNewBlogs.data.listNewBlogs.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'B-1',
            content: 'Blog 1',
            posts: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({ id: 'P-1A', content: 'Post 1A' }),
                expect.objectContaining({ id: 'P-1B', content: 'Post 1B' }),
                expect.objectContaining({ id: 'P-1C', content: 'Post 1C' }),
              ]),
            }),
          }),
          expect.objectContaining({
            id: 'B-2',
            content: 'Blog 2',
            posts: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({ id: 'P-2A', content: 'Post 2A' }),
                expect.objectContaining({ id: 'P-2B', content: 'Post 2B' }),
              ]),
            }),
          }),
          expect.objectContaining({
            id: 'B-3',
            content: 'Blog 3',
            posts: expect.objectContaining({
              items: expect.arrayContaining([expect.objectContaining({ id: 'P-3A', content: 'Post 3A' })]),
            }),
          }),
        ]),
      );

      const getNewPost1A = await newPostHelper.get({
        id: 'P-1A',
      });
      expect(getNewPost1A.data.getNewPost.id).toEqual('P-1A');
      expect(getNewPost1A.data.getNewPost.content).toEqual('Post 1A');
      expect(getNewPost1A.data.getNewPost.blog).toBeDefined();
      expect(getNewPost1A.data.getNewPost.blog.id).toEqual('B-1');
      expect(getNewPost1A.data.getNewPost.blog.content).toEqual('Blog 1');

      const listNewPosts = await newPostHelper.list();
      expect(listNewPosts.data.listNewPosts.items.length).toEqual(6);
      expect(listNewPosts.data.listNewPosts.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'P-1A',
            content: 'Post 1A',
            blog: expect.objectContaining({
              id: 'B-1',
              content: 'Blog 1',
            }),
          }),
          expect.objectContaining({
            id: 'P-1B',
            content: 'Post 1B',
            blog: expect.objectContaining({
              id: 'B-1',
              content: 'Blog 1',
            }),
          }),
          expect.objectContaining({
            id: 'P-1C',
            content: 'Post 1C',
            blog: expect.objectContaining({
              id: 'B-1',
              content: 'Blog 1',
            }),
          }),
          expect.objectContaining({
            id: 'P-2A',
            content: 'Post 2A',
            blog: expect.objectContaining({
              id: 'B-2',
              content: 'Blog 2',
            }),
          }),
          expect.objectContaining({
            id: 'P-2B',
            content: 'Post 2B',
            blog: expect.objectContaining({
              id: 'B-2',
              content: 'Blog 2',
            }),
          }),
          expect.objectContaining({
            id: 'P-3A',
            content: 'Post 3A',
            blog: expect.objectContaining({
              id: 'B-3',
              content: 'Blog 3',
            }),
          }),
        ]),
      );

      await newBlogHelper.update('updateNewBlog', {
        id: 'B-3',
        content: 'Blog 3 Updated',
      });
      const getUpdatedNewBlog3 = await newBlogHelper.get({
        id: 'B-3',
      });
      expect(getUpdatedNewBlog3.data.getNewBlog.id).toEqual('B-3');
      expect(getUpdatedNewBlog3.data.getNewBlog.content).toEqual('Blog 3 Updated');
      expect(getUpdatedNewBlog3.data.getNewBlog.posts.items.length).toEqual(1);
      expect(getUpdatedNewBlog3.data.getNewBlog.posts.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'P-3A', content: 'Post 3A' })]),
      );

      const deletedNewPost3A = await newPostHelper.delete('deleteNewPost', {
        id: 'P-3A',
      });

      expect(deletedNewPost3A.data.deleteNewPost.id).toEqual('P-3A');
      expect(deletedNewPost3A.data.deleteNewPost.content).toEqual('Post 3A');
    });

    test('check hasOne and belongsTo directives on tables with name mappings', async () => {
      const newUserHelper = constructNewUserHelper();
      const newProfileHelper = constructNewProfileHelper();

      await newUserHelper.create('createNewUser', {
        id: 'U-1',
        name: 'User 1',
      });
      await newUserHelper.create('createNewUser', {
        id: 'U-2',
        name: 'User 2',
      });
      await newUserHelper.create('createNewUser', {
        id: 'U-3',
        name: 'User 3',
      });

      await newProfileHelper.create('createNewProfile', {
        id: 'P-1',
        details: 'Profile 1',
        userId: 'U-1',
      });
      await newProfileHelper.create('createNewProfile', {
        id: 'P-2',
        details: 'Profile 2',
        userId: 'U-2',
      });

      const getNewUser1 = await newUserHelper.get({
        id: 'U-1',
      });
      expect(getNewUser1.data.getNewUser.id).toEqual('U-1');
      expect(getNewUser1.data.getNewUser.name).toEqual('User 1');
      expect(getNewUser1.data.getNewUser.profile).toBeDefined();
      expect(getNewUser1.data.getNewUser.profile.id).toEqual('P-1');
      expect(getNewUser1.data.getNewUser.profile.details).toEqual('Profile 1');

      const getNewUser3 = await newUserHelper.get({
        id: 'U-3',
      });
      expect(getNewUser3.data.getNewUser.id).toEqual('U-3');
      expect(getNewUser3.data.getNewUser.name).toEqual('User 3');
      expect(getNewUser3.data.getNewUser.profile).toBeNull();

      const listNewUsers = await newUserHelper.list();
      expect(listNewUsers.data.listNewUsers.items.length).toEqual(3);
      expect(listNewUsers.data.listNewUsers.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'U-1',
            name: 'User 1',
            profile: expect.objectContaining({
              id: 'P-1',
              details: 'Profile 1',
            }),
          }),
          expect.objectContaining({
            id: 'U-2',
            name: 'User 2',
            profile: expect.objectContaining({
              id: 'P-2',
              details: 'Profile 2',
            }),
          }),
          expect.objectContaining({ id: 'U-3', name: 'User 3', profile: null }),
        ]),
      );

      const getNewProfile1 = await newProfileHelper.get({
        id: 'P-1',
      });
      expect(getNewProfile1.data.getNewProfile.id).toEqual('P-1');
      expect(getNewProfile1.data.getNewProfile.details).toEqual('Profile 1');
      expect(getNewProfile1.data.getNewProfile.user).toBeDefined();
      expect(getNewProfile1.data.getNewProfile.user.id).toEqual('U-1');
      expect(getNewProfile1.data.getNewProfile.user.name).toEqual('User 1');

      const listNewProfiles = await newProfileHelper.list();
      expect(listNewProfiles.data.listNewProfiles.items.length).toEqual(2);
      expect(listNewProfiles.data.listNewProfiles.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'P-1',
            details: 'Profile 1',
            user: expect.objectContaining({
              id: 'U-1',
              name: 'User 1',
            }),
          }),
          expect.objectContaining({
            id: 'P-2',
            details: 'Profile 2',
            user: expect.objectContaining({
              id: 'U-2',
              name: 'User 2',
            }),
          }),
        ]),
      );

      await newUserHelper.update('updateNewUser', {
        id: 'U-3',
        name: 'User 3 Updated',
      });
      const getUpdatedNewUser3 = await newUserHelper.get({
        id: 'U-3',
      });
      expect(getUpdatedNewUser3.data.getNewUser.id).toEqual('U-3');
      expect(getUpdatedNewUser3.data.getNewUser.name).toEqual('User 3 Updated');
      expect(getUpdatedNewUser3.data.getNewUser.profile).toBeNull();

      const deletedNewProfile2 = await newProfileHelper.delete('deleteNewProfile', {
        id: 'P-2',
      });

      expect(deletedNewProfile2.data.deleteNewProfile.id).toEqual('P-2');
      expect(deletedNewProfile2.data.deleteNewProfile.details).toEqual('Profile 2');
    });

    const constructNewBlogHelper = (): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
              id
              content
            `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetNewBlog($id: String!) {
          getNewBlog(id: $id) {
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
        query ListNewBlogs {
          listNewBlogs {
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
      const helper = new GQLQueryHelper(appSyncClient, 'NewBlog', {
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

    const constructNewPostHelper = (): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
              id
              content
            `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetNewPost($id: String!) {
          getNewPost(id: $id) {
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
        query ListNewPosts {
          listNewPosts {
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
      const helper = new GQLQueryHelper(appSyncClient, 'NewPost', {
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

    const constructNewUserHelper = (): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
              id
              name
            `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetNewUser($id: String!) {
          getNewUser(id: $id) {
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
        query ListNewUsers {
          listNewUsers {
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
      const helper = new GQLQueryHelper(appSyncClient, 'NewUser', {
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

    const constructNewProfileHelper = (): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
              id
              details
            `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetNewProfile($id: String!) {
          getNewProfile(id: $id) {
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
        query ListNewProfiles {
          listNewProfiles {
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
      const helper = new GQLQueryHelper(appSyncClient, 'NewProfile', {
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

    const constructNewTaskHelper = (): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
                id
                description
              `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetNewTask($id: String!) {
          getNewTask(id: $id) {
            id
            description
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query ListNewTasks {
          listNewTasks {
            items {
              id
              description
            }
          }
        }
      `;
      const helper = new GQLQueryHelper(appSyncClient, 'NewTask', {
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

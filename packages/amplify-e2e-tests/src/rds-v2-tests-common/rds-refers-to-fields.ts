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
import { existsSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

export const testRDSRefersToFields = (engine: ImportedRDSType, queries: string[]) => {
  describe('RDS refersTo directive on model fields', () => {
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
    const projName = `${engineSuffix}refer2`;
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
              newContent: String @refersTo(name: "content")
              posts: [NewPost] @hasMany(references: ["newBlogId"])
            }
            type NewPost @model @refersTo(name: "Post") {
              id: String! @primaryKey
              content: String
              newBlogId: String! @refersTo(name: "blogId")
              blog: NewBlog @belongsTo(references: ["newBlogId"])
            }
            type NewUser @model @refersTo(name: "User") {
              newId: String! @primaryKey @refersTo(name: "id")
              name: String
              profile: NewProfile @hasOne(references: ["userId"])
            }
            type NewProfile @model @refersTo(name: "Profile") {
              id: String! @primaryKey
              newDetails: String @refersTo(name: "details")
              userId: String!
              user: NewUser @belongsTo(references: ["userId"])
            }
            type Task @model {
              newId: String! @primaryKey @refersTo(name: "id")
              newName: String! @refersTo(name: "name")
              newDescription: String!
                @refersTo(name: "description")
                @index(name: "taskByDescriptionAndName", sortKeyFields: ["newName"], queryField: "taskByDescriptionAndName")
            }
          `;
      writeFileSync(rdsSchemaFilePath, schema, 'utf8');
    };

    test('check CRUD operations on model with index field with name mapping', async () => {
      const taskHelper = constructTaskHelper();

      await taskHelper.create('createTask', {
        newId: 'T-1',
        newName: 'Name 1',
        newDescription: 'Task 1',
      });
      await taskHelper.create('createTask', {
        newId: 'T-2',
        newName: 'Name 2',
        newDescription: 'Task 2',
      });

      const getTask1 = await taskHelper.get({
        newId: 'T-1',
      });
      expect(getTask1.data.getTask.newId).toEqual('T-1');
      expect(getTask1.data.getTask.newName).toEqual('Name 1');
      expect(getTask1.data.getTask.newDescription).toEqual('Task 1');

      const listTasks = await taskHelper.list();
      expect(listTasks.data.listTasks.items.length).toEqual(2);
      expect(listTasks.data.listTasks.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            newId: 'T-1',
            newName: 'Name 1',
            newDescription: 'Task 1',
          }),
          expect.objectContaining({
            newId: 'T-2',
            newName: 'Name 2',
            newDescription: 'Task 2',
          }),
        ]),
      );

      const updatedTask2 = await taskHelper.update('updateTask', {
        newId: 'T-2',
        newDescription: 'Task 2 Updated',
      });
      expect(updatedTask2.data.updateTask.newId).toEqual('T-2');
      expect(updatedTask2.data.updateTask.newName).toEqual('Name 2');
      expect(updatedTask2.data.updateTask.newDescription).toEqual('Task 2 Updated');

      const deletedTask2 = await taskHelper.delete('deleteTask', {
        newId: 'T-2',
      });
      expect(deletedTask2.data.deleteTask.newId).toEqual('T-2');
      expect(deletedTask2.data.deleteTask.newName).toEqual('Name 2');
      expect(deletedTask2.data.deleteTask.newDescription).toEqual('Task 2 Updated');
    });

    test('check hasMany and belongsTo directives on tables with field name mappings', async () => {
      const newBlogHelper = constructNewBlogHelper();
      const newPostHelper = constructNewPostHelper();

      await newBlogHelper.create('createNewBlog', {
        id: 'B-1',
        newContent: 'Blog 1',
      });
      await newBlogHelper.create('createNewBlog', {
        id: 'B-2',
        newContent: 'Blog 2',
      });
      await newBlogHelper.create('createNewBlog', {
        id: 'B-3',
        newContent: 'Blog 3',
      });

      await newPostHelper.create('createNewPost', {
        id: 'P-1A',
        content: 'Post 1A',
        newBlogId: 'B-1',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-1B',
        content: 'Post 1B',
        newBlogId: 'B-1',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-1C',
        content: 'Post 1C',
        newBlogId: 'B-1',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-2A',
        content: 'Post 2A',
        newBlogId: 'B-2',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-2B',
        content: 'Post 2B',
        newBlogId: 'B-2',
      });
      await newPostHelper.create('createNewPost', {
        id: 'P-3A',
        content: 'Post 3A',
        newBlogId: 'B-3',
      });

      const getNewBlog1 = await newBlogHelper.get({
        id: 'B-1',
      });
      expect(getNewBlog1.data.getNewBlog.id).toEqual('B-1');
      expect(getNewBlog1.data.getNewBlog.newContent).toEqual('Blog 1');
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
      expect(getNewBlog2.data.getNewBlog.newContent).toEqual('Blog 2');
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
      expect(getNewBlog3.data.getNewBlog.newContent).toEqual('Blog 3');
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
            newContent: 'Blog 1',
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
            newContent: 'Blog 2',
            posts: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({ id: 'P-2A', content: 'Post 2A' }),
                expect.objectContaining({ id: 'P-2B', content: 'Post 2B' }),
              ]),
            }),
          }),
          expect.objectContaining({
            id: 'B-3',
            newContent: 'Blog 3',
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
      // expect(getNewPost1A.data.getNewPost.blog.newContent).toEqual('Blog 1');

      const listNewPosts = await newPostHelper.list();
      expect(listNewPosts.data.listNewPosts.items.length).toEqual(6);
      expect(listNewPosts.data.listNewPosts.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'P-1A',
            content: 'Post 1A',
            blog: expect.objectContaining({
              id: 'B-1',
              newContent: 'Blog 1',
            }),
          }),
          expect.objectContaining({
            id: 'P-1B',
            content: 'Post 1B',
            blog: expect.objectContaining({
              id: 'B-1',
              newContent: 'Blog 1',
            }),
          }),
          expect.objectContaining({
            id: 'P-1C',
            content: 'Post 1C',
            blog: expect.objectContaining({
              id: 'B-1',
              newContent: 'Blog 1',
            }),
          }),
          expect.objectContaining({
            id: 'P-2A',
            content: 'Post 2A',
            blog: expect.objectContaining({
              id: 'B-2',
              newContent: 'Blog 2',
            }),
          }),
          expect.objectContaining({
            id: 'P-2B',
            content: 'Post 2B',
            blog: expect.objectContaining({
              id: 'B-2',
              newContent: 'Blog 2',
            }),
          }),
          expect.objectContaining({
            id: 'P-3A',
            content: 'Post 3A',
            blog: expect.objectContaining({
              id: 'B-3',
              newContent: 'Blog 3',
            }),
          }),
        ]),
      );

      await newBlogHelper.update('updateNewBlog', {
        id: 'B-3',
        newContent: 'Blog 3 Updated',
      });
      const getUpdatedNewBlog3 = await newBlogHelper.get({
        id: 'B-3',
      });
      expect(getUpdatedNewBlog3.data.getNewBlog.id).toEqual('B-3');
      expect(getUpdatedNewBlog3.data.getNewBlog.newContent).toEqual('Blog 3 Updated');
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
        newId: 'U-1',
        name: 'User 1',
      });
      await newUserHelper.create('createNewUser', {
        newId: 'U-2',
        name: 'User 2',
      });
      await newUserHelper.create('createNewUser', {
        newId: 'U-3',
        name: 'User 3',
      });

      await newProfileHelper.create('createNewProfile', {
        id: 'P-1',
        newDetails: 'Profile 1',
        userId: 'U-1',
      });
      await newProfileHelper.create('createNewProfile', {
        id: 'P-2',
        newDetails: 'Profile 2',
        userId: 'U-2',
      });

      const getNewUser1 = await newUserHelper.get({
        newId: 'U-1',
      });
      expect(getNewUser1.data.getNewUser.newId).toEqual('U-1');
      expect(getNewUser1.data.getNewUser.name).toEqual('User 1');
      expect(getNewUser1.data.getNewUser.profile).toBeDefined();
      expect(getNewUser1.data.getNewUser.profile.id).toEqual('P-1');
      expect(getNewUser1.data.getNewUser.profile.newDetails).toEqual('Profile 1');

      const getNewUser3 = await newUserHelper.get({
        newId: 'U-3',
      });
      expect(getNewUser3.data.getNewUser.newId).toEqual('U-3');
      expect(getNewUser3.data.getNewUser.name).toEqual('User 3');
      expect(getNewUser3.data.getNewUser.profile).toBeNull();

      const listNewUsers = await newUserHelper.list();
      expect(listNewUsers.data.listNewUsers.items.length).toEqual(3);
      expect(listNewUsers.data.listNewUsers.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            newId: 'U-1',
            name: 'User 1',
            profile: expect.objectContaining({
              id: 'P-1',
              newDetails: 'Profile 1',
            }),
          }),
          expect.objectContaining({
            newId: 'U-2',
            name: 'User 2',
            profile: expect.objectContaining({
              id: 'P-2',
              newDetails: 'Profile 2',
            }),
          }),
          expect.objectContaining({ newId: 'U-3', name: 'User 3', profile: null }),
        ]),
      );

      const getNewProfile1 = await newProfileHelper.get({
        id: 'P-1',
      });
      expect(getNewProfile1.data.getNewProfile.id).toEqual('P-1');
      expect(getNewProfile1.data.getNewProfile.newDetails).toEqual('Profile 1');
      expect(getNewProfile1.data.getNewProfile.user).toBeDefined();
      expect(getNewProfile1.data.getNewProfile.user.newId).toEqual('U-1');
      expect(getNewProfile1.data.getNewProfile.user.name).toEqual('User 1');

      const listNewProfiles = await newProfileHelper.list();
      expect(listNewProfiles.data.listNewProfiles.items.length).toEqual(2);
      expect(listNewProfiles.data.listNewProfiles.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'P-1',
            newDetails: 'Profile 1',
            user: expect.objectContaining({
              newId: 'U-1',
              name: 'User 1',
            }),
          }),
          expect.objectContaining({
            id: 'P-2',
            newDetails: 'Profile 2',
            user: expect.objectContaining({
              newId: 'U-2',
              name: 'User 2',
            }),
          }),
        ]),
      );

      await newUserHelper.update('updateNewUser', {
        newId: 'U-3',
        name: 'User 3 Updated',
      });
      const getUpdatedNewUser3 = await newUserHelper.get({
        newId: 'U-3',
      });
      expect(getUpdatedNewUser3.data.getNewUser.newId).toEqual('U-3');
      expect(getUpdatedNewUser3.data.getNewUser.name).toEqual('User 3 Updated');
      expect(getUpdatedNewUser3.data.getNewUser.profile).toBeNull();

      const deletedNewProfile2 = await newProfileHelper.delete('deleteNewProfile', {
        id: 'P-2',
      });

      expect(deletedNewProfile2.data.deleteNewProfile.id).toEqual('P-2');
      expect(deletedNewProfile2.data.deleteNewProfile.newDetails).toEqual('Profile 2');
    });

    const constructNewBlogHelper = (): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
                id
                newContent
              `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetNewBlog($id: String!) {
          getNewBlog(id: $id) {
            id
            newContent
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
              newContent
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
              newContent
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
                newContent
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
                newId
                name
              `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetNewUser($newId: String!) {
          getNewUser(newId: $newId) {
            newId
            name
            profile {
              id
              newDetails
            }
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query ListNewUsers {
          listNewUsers {
            items {
              newId
              name
              profile {
                id
                newDetails
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
                newDetails
              `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetNewProfile($id: String!) {
          getNewProfile(id: $id) {
            id
            newDetails
            user {
              newId
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
              newDetails
              user {
                newId
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

    const constructTaskHelper = (): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
                  newId
                  newName
                  newDescription
              `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query GetTask($newId: String!) {
          getTask(newId: $newId) {
            newId
            newName
            newDescription
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query ListTasks {
          listTasks {
            items {
              newId
              newName
              newDescription
            }
          }
        }
      `;
      const helper = new GQLQueryHelper(appSyncClient, 'Task', {
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

import {
  addApiWithAllAuthModes,
  amplifyPush,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  enableUserPoolUnauthenticatedAccess,
  getAppSyncApi,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  setupRDSInstanceAndData,
  sleep,
} from 'amplify-category-api-e2e-core';
import { existsSync, removeSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import { configureAmplify, getConfiguredAppsyncClientIAMAuth, getUserPoolId, setupUser, signInUser } from '../schema-api-directives';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { SQL_TESTS_USE_BETA } from './sql-e2e-config';
import {
  checkListItemExistence,
  checkListResponseErrors,
  checkOperationResult,
  configureAppSyncClients,
  expectedFieldErrors,
  expectedOperationError,
  getDefaultDatabasePort,
} from '../rds-v2-test-utils';
import { Auth } from 'aws-amplify';
import { schema, sqlCreateStatements } from '../__tests__/auth-test-schemas/userpool-iam-fields';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

export const testRdsUserpoolIAMFieldAuth = (engine: ImportedRDSType, queries: string[]): void => {
  describe('RDS userpool & IAM field auth', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'us-east-1'; // This get overwritten in beforeAll
    let port = getDefaultDatabasePort(engine);
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const engineSuffix = engine === ImportedRDSType.MYSQL ? 'ms' : 'pg';
    const engineName = engine === ImportedRDSType.MYSQL ? 'mysql' : 'postgres';
    const projName = `${engineSuffix}multifieldauth1`;
    const apiName = projName;

    const modelName = 'Post';
    const createResultSetName = `create${modelName}`;
    const updateResultSetName = `update${modelName}`;
    const deleteResultSetName = `delete${modelName}`;
    const getResultSetName = `get${modelName}`;
    const listResultSetName = `list${modelName}s`;

    const userName1 = 'user1';
    const userName2 = 'user2';
    const userName3 = 'user3';
    const privateIAMUserName = 'iamuser';
    const userPassword = 'user@Password';
    const userPoolProvider = 'userPools';
    const userMap = {};

    let projRoot;
    let apiEndPoint;
    let appSyncClients = {};
    let userpoolAppSyncClients;
    let postIAMPublicClient: GQLQueryHelper, postIAMPrivateClient: GQLQueryHelper;
    let postUser1Client: GQLQueryHelper, postUser2Client: GQLQueryHelper, postUser3Client: GQLQueryHelper;

    beforeAll(async () => {
      console.log(sqlCreateStatements(engine));

      projRoot = await createNewProjectDir(projName);
      await initProjectAndImportSchema();
      await sleep(2 * 60 * 1000); // Wait for 2 minutes for the VPC endpoints to be live.

      const meta = getProjectMeta(projRoot);
      const appRegion = meta.providers.awscloudformation.Region;
      const { output } = meta.api[apiName];
      const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
      apiEndPoint = GraphQLAPIEndpointOutput as string;

      const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, appRegion);

      expect(GraphQLAPIIdOutput).toBeDefined();
      expect(GraphQLAPIEndpointOutput).toBeDefined();
      expect(GraphQLAPIKeyOutput).toBeDefined();

      expect(graphqlApi).toBeDefined();
      expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

      await createAppSyncClients(apiEndPoint, appRegion);
    });

    const createAppSyncClients = async (apiEndPoint, appRegion): Promise<void> => {
      const userPoolId = getUserPoolId(projRoot);
      configureAmplify(projRoot);

      // unauth IAM client
      const unAuthCredentials = await Auth.currentCredentials();
      const unauthAppSyncClient = getConfiguredAppsyncClientIAMAuth(apiEndPoint, appRegion, unAuthCredentials);
      // auth IAM client
      // in this case use signed-in user from cognito to be authenticated IAM role
      // to simulate the lambda function role scenario
      await setupUser(userPoolId, privateIAMUserName, userPassword);
      await signInUser(privateIAMUserName, userPassword);
      const authCredentials = await Auth.currentCredentials();
      const authAppSyncClient = getConfiguredAppsyncClientIAMAuth(apiEndPoint, appRegion, authCredentials);
      // cognito userpool clients
      await setupUser(userPoolId, userName1, userPassword);
      await setupUser(userPoolId, userName2, userPassword);
      await setupUser(userPoolId, userName3, userPassword);
      const user1 = await signInUser(userName1, userPassword);
      userMap[userName1] = user1;
      const user2 = await signInUser(userName2, userPassword);
      userMap[userName2] = user2;
      const user3 = await signInUser(userName3, userPassword);
      userMap[userName3] = user3;
      appSyncClients = await configureAppSyncClients(projRoot, apiName, [userPoolProvider], userMap);
      userpoolAppSyncClients = appSyncClients[userPoolProvider];

      postIAMPublicClient = constructModelHelper(modelName, unauthAppSyncClient);
      postIAMPrivateClient = constructModelHelper(modelName, authAppSyncClient);
      postUser1Client = constructModelHelper(modelName, userpoolAppSyncClients[userName1]);
      postUser2Client = constructModelHelper(modelName, userpoolAppSyncClients[userName2]);
      postUser3Client = constructModelHelper(modelName, userpoolAppSyncClients[userName3]);
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

      const db = await setupRDSInstanceAndData(dbConfig, sqlCreateStatements(engine));
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
      await addApiWithAllAuthModes(projRoot, { transformerVersion: 2, apiName });
      // Remove DDB schema
      const ddbSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.graphql');
      removeSync(ddbSchemaFilePath);
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
      // Write RDS schema
      const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
      const rdsSchema = appendAmplifyInput(schema, engine);
      writeFileSync(rdsSchemaFilePath, rdsSchema, 'utf8');
      // Enable unauthenticated access to the Cognito resource and push again
      await enableUserPoolUnauthenticatedAccess(projRoot);
      await amplifyPush(projRoot, false, {
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
      // Make a dummy edit for schema and re-push
      // This is a known bug in which deploying the userpool auth with sql schema cannot be done within one push
      writeFileSync(rdsSchemaFilePath, `${rdsSchema}\n`, 'utf8');
      await amplifyPush(projRoot, false, {
        skipCodegen: true,
        useBetaSqlLayer: SQL_TESTS_USE_BETA,
      });
    };

    test('userpool owner can perform all valid operations on post', async () => {
      const post = {
        id: 'P-1',
        title: 'My Post 1',
        owner: userName1,
        subscriberList: [userName2],
        likes: 0,
        subscriberContent: 'Exclusive content 1',
      };
      // userpool owner cannot create a post without restricted field `likes`
      const createPostResult = await postUser1Client.create(createResultSetName, omit(post, 'likes'));
      expect(createPostResult.data[createResultSetName]).toEqual(expect.objectContaining(omit(post, 'subscriberContent')));
      // subscriber content is protected and cannot be read upon mutation
      expect(createPostResult.data[createResultSetName].subscriberContent).toBeNull();
      // userpool owner cannot create a post with field input `likes`
      await expect(
        async () =>
          await postUser1Client.create(createResultSetName, {
            id: 'P-2',
            title: 'My Post 2',
            subscriberList: [userName1],
            subscriberContent: 'Exclusive content 2',
            likes: 10,
          }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));
      // userpool owner can read allowed fields
      const getPostResult = await postUser1Client.get({
        id: post.id,
      });
      expect(getPostResult.data[getResultSetName]).toEqual(expect.objectContaining(post));
      const listPostsResult = await postUser1Client.list();
      expect(listPostsResult.data[listResultSetName].items).toEqual(expect.arrayContaining([expect.objectContaining(post)]));
      // userpool owner can update allowed fields
      const updatedPost = {
        id: post.id,
        title: 'My Post 1 updated',
        owner: userName1,
        subscriberList: [userName2, userName3],
        likes: 0,
        subscriberContent: 'Exclusive content 1 updated',
      };
      // cannot update likes
      await expect(
        async () =>
          await postUser1Client.update(updateResultSetName, {
            id: updatedPost.id,
            likes: 10,
          }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));
      const updatePostResult = await postUser1Client.update(updateResultSetName, omit(updatedPost, 'likes'));
      expect(updatePostResult.data[updateResultSetName]).toEqual(expect.objectContaining(omit(updatedPost, 'subscriberContent')));
      // subscriber content is protected and cannot be read upon mutation
      expect(updatePostResult.data[updateResultSetName].subscriberContent).toBeNull();
      // unless one has delete access to all fields in the model, delete is expected to fail
      // userpool owner cannot delete the post
      await expect(
        async () => await postUser1Client.delete(deleteResultSetName, { id: post.id }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(deleteResultSetName, 'Mutation'));
      // remove the post by private iam role
      await postIAMPrivateClient.delete(deleteResultSetName, { id: post.id });
    });
    test('private iam role can perform all valid operations on post', async () => {
      // private iam role can create a post with allowed fields (except `likes`, `subscriberContent`)
      const post = {
        id: 'P-2',
        title: 'My Post 2',
        owner: userName2,
        subscriberList: [userName3],
        likes: 0,
        subscriberContent: 'Exclusive content 2',
      };
      await expect(async () => await postIAMPrivateClient.create(createResultSetName, post)).rejects.toThrowErrorMatchingInlineSnapshot(
        expectedOperationError(createResultSetName, 'Mutation'),
      );

      const createPostResult = await postIAMPrivateClient.create(createResultSetName, omit(post, 'likes', 'subscriberContent'));
      expect(createPostResult.data[createResultSetName]).toEqual(expect.objectContaining(omit(post, 'subscriberContent')));
      // user2 should be able to update subscriber content to the post created by private iam
      await postUser2Client.update(updateResultSetName, {
        id: post.id,
        subscriberContent: post.subscriberContent,
      });
      // private iam role can read all the fields
      const getPostResult = await postIAMPrivateClient.get({
        id: post.id,
      });
      expect(getPostResult.data[getResultSetName]).toEqual(expect.objectContaining(post));
      const listPostsResult = await postIAMPrivateClient.list();
      expect(listPostsResult.data[listResultSetName].items).toEqual(expect.arrayContaining([expect.objectContaining(post)]));
      // private iam role can update all the fields
      const updatedPost = {
        id: post.id,
        title: 'My Post 2 updated',
        owner: userName2,
        likes: 10,
        subscriberList: [userName1, userName3],
        subscriberContent: 'Exclusive content 2 updated',
      };
      const updatePostResult = await postIAMPrivateClient.update(updateResultSetName, updatedPost);
      expect(updatePostResult.data[updateResultSetName]).toEqual(expect.objectContaining(omit(updatedPost, 'subscriberContent')));
      // subscriber content is protected and cannot be read upon mutation
      expect(updatePostResult.data[updateResultSetName].subscriberContent).toBeNull();
      // private iam role can delete a post
      const deletePostResult = await postIAMPrivateClient.delete(deleteResultSetName, { id: post.id });
      expect(deletePostResult.data[deleteResultSetName]).toEqual(expect.objectContaining(omit(updatedPost, 'subscriberContent')));
      // subscriber content is protected and cannot be read upon mutation
      expect(deletePostResult.data[deleteResultSetName].subscriberContent).toBeNull();
    });
    test('public iam role can perform all valid operations on post', async () => {
      const post = {
        id: 'P-3',
        title: 'My Post 3',
        owner: userName3,
        subscriberList: [userName1, userName2],
        likes: 0,
        subscriberContent: 'Exclusive content 3',
      };
      await postUser3Client.create(createResultSetName, omit(post, 'likes'));
      // public iam role can only read restricted fields
      const getPostResult = await postIAMPublicClient.get(
        {
          id: post.id,
        },
        undefined,
        true,
        'all',
      );
      checkOperationResult(
        getPostResult,
        { ...post, subscriberList: null, subscriberContent: null },
        getResultSetName,
        false,
        expectedFieldErrors(['subscriberContent', 'subscriberList'], 'Post'),
      );
      const listPostsResult = await postIAMPublicClient.list({}, undefined, listResultSetName, true, 'all');
      checkListItemExistence(listPostsResult, listResultSetName, post.id, true);
      checkListResponseErrors(listPostsResult, expectedFieldErrors(['subscriberContent', 'subscriberList'], 'Post', false));

      // public iam role cannot do CUD operatioins
      await expect(
        async () => await postIAMPublicClient.create(createResultSetName, { id: 'P-invalid', title: 'My Post 3' }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(createResultSetName, 'Mutation'));

      const updatedPost = {
        id: post.id,
        title: 'My Post 3 updated',
        owner: userName2,
        subscriberList: [userName2, userName3],
        likes: 10,
        subscriberContent: 'Exclusive content 3 updated',
      };
      Object.entries(omit(updatedPost, 'id')).forEach(async (entry) => {
        const updateInput = Object.fromEntries([['id', post.id], entry]);
        await expect(
          async () => await postIAMPublicClient.update(updateResultSetName, updateInput),
        ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(updateResultSetName, 'Mutation'));
      });

      await expect(
        async () => await postIAMPublicClient.delete(deleteResultSetName, { id: post.id }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(deleteResultSetName, 'Mutation'));
      // remove the post by private iam role
      await postIAMPrivateClient.delete(deleteResultSetName, { id: post.id });
    });
    test('signed in non-owner users(private userpool) can perform all valid operations on post', async () => {
      const post = {
        id: 'P-4',
        title: 'My Post 4',
        owner: userName1,
        subscriberList: [userName2],
        likes: 0,
        subscriberContent: 'Exclusive content 4',
      };
      await postUser1Client.create(createResultSetName, omit(post, 'likes'));
      // private userpool(signed-in) users cannot read subscriber content if they are not in the subscriber list or owner
      const getPostResult = await postUser3Client.get(
        {
          id: post.id,
        },
        undefined,
        true,
        'all',
      );
      checkOperationResult(
        getPostResult,
        { ...post, subscriberContent: null },
        getResultSetName,
        false,
        expectedFieldErrors(['subscriberContent'], 'Post'),
      );
      const listPostsResult = await postUser3Client.list({}, undefined, listResultSetName, true, 'all');
      checkListItemExistence(listPostsResult, listResultSetName, post.id, true);
      checkListResponseErrors(listPostsResult, expectedFieldErrors(['subscriberContent'], 'Post', false));
      // private userpool(signed-in) users cannot update or delete fields in post if they are not owner
      const updatedPost = {
        id: post.id,
        title: 'My Post 4 updated',
        owner: userName2,
        subscriberList: [userName1, userName3],
        likes: 10,
        subscriberContent: 'Exclusive content 4 updated',
      };
      Object.entries(omit(updatedPost, 'id')).forEach(async (entry) => {
        const updateInput = Object.fromEntries([['id', post.id], entry]);
        await expect(async () => await postUser3Client.update(updateResultSetName, updateInput)).rejects.toThrowErrorMatchingInlineSnapshot(
          expectedOperationError(updateResultSetName, 'Mutation'),
        );
      });

      await expect(
        async () => await postUser3Client.delete(deleteResultSetName, { id: post.id }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(deleteResultSetName, 'Mutation'));

      // remove the post by private iam role
      await postIAMPrivateClient.delete(deleteResultSetName, { id: post.id });
    });
    test('subscribers(onwer field as array) can perform all valid operations on post', async () => {
      const post = {
        id: 'P-5',
        title: 'My Post 5',
        owner: userName1,
        subscriberList: [userName2],
        likes: 0,
        subscriberContent: 'Exclusive content 5',
      };
      await postUser1Client.create(createResultSetName, omit(post, 'likes'));
      // subscriber can read subscriber content
      const getPostResult = await postUser2Client.get({
        id: post.id,
      });
      expect(getPostResult.data[getResultSetName]).toEqual(expect.objectContaining(post));
      const listPostsResult = await postUser2Client.list();
      expect(listPostsResult.data[listResultSetName].items).toEqual(expect.arrayContaining([expect.objectContaining(post)]));
      // non-owner subscriber cannot update or delete any fields in post
      const updatedPost = {
        id: 'P-5',
        title: 'My Post 5 updated',
        owner: userName2,
        subscriberList: [userName2, userName3],
        likes: 10,
        subscriberContent: 'Exclusive content 5 updated',
      };
      Object.entries(omit(updatedPost, 'id')).forEach(async (entry) => {
        const updateInput = Object.fromEntries([['id', post.id], entry]);
        await expect(async () => await postUser2Client.update(updateResultSetName, updateInput)).rejects.toThrowErrorMatchingInlineSnapshot(
          expectedOperationError(updateResultSetName, 'Mutation'),
        );
      });
      // cannot delete the post
      await expect(
        async () => await postUser2Client.delete(deleteResultSetName, { id: post.id }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(expectedOperationError(deleteResultSetName, 'Mutation'));

      // remove the post by private iam role
      await postIAMPrivateClient.delete(deleteResultSetName, { id: post.id });
    });

    // helper functions
    const constructModelHelper = (name: string, client): GQLQueryHelper => {
      const createSelectionSet = /* GraphQL */ `
        id
        title
        owner
        subscriberList
        subscriberContent
        likes
      `;
      const updateSelectionSet = createSelectionSet;
      const deleteSelectionSet = createSelectionSet;
      const getSelectionSet = /* GraphQL */ `
        query Get${name}($id: ID!) {
          get${name}(id: $id) {
            id
            title
            owner
            subscriberList
            subscriberContent
            likes
          }
        }
      `;
      const listSelectionSet = /* GraphQL */ `
        query List${name}s {
          list${name}s {
            items {
              id
              title
              owner
              subscriberList
              subscriberContent
              likes
            }
          }
        }
      `;
      const helper = new GQLQueryHelper(client, name, {
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
    const appendAmplifyInput = (schema: string, engine: ImportedRDSType): string => {
      const amplifyInput = (engineName: ImportedRDSType): string => {
        return `
          input AMPLIFY {
            engine: String = "${engineName}",
          }
        `;
      };
      return amplifyInput(engine) + '\n' + schema;
    };
    const omit = <T extends {}, K extends keyof T>(obj: T, ...keys: K[]) =>
      Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>;
  });
};

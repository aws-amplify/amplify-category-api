import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import {
  addApi,
  amplifyPush,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  setupRDSInstanceAndData,
  sleep,
  updateAuthAddUserGroups,
} from 'amplify-category-api-e2e-core';
import { existsSync, removeSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import {
  appendAmplifyInput,
  checkListItemExistence,
  checkOperationResult,
  configureAppSyncClients,
  getAppSyncEndpoint,
} from '../rds-v2-test-utils';
import { SQL_TESTS_USE_BETA } from '../rds-v2-tests-common/sql-e2e-config';
import { configureAmplify, getUserPoolId, setupUser, signInUser } from '../schema-api-directives';
import { schema, sqlCreateStatements } from './auth-test-schemas/userpool-apikey';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Cognito userpool provider Auth tests', () => {
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  let region = 'us-east-1';
  let port = 3306;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const projName = 'rdsuserpoolauth';
  const userName1 = 'user1';
  const userName2 = 'user2';
  const userName3 = 'user3';
  const adminGroupName = 'Admin';
  const devGroupName = 'Dev';
  const moderatorGroupName = 'Moderator';
  const userPassword = 'user@Password';
  const userPoolProvider = 'userPools';
  const apiKeyProvider = 'apiKey';
  let graphQlEndpoint = 'localhost';

  let projRoot;
  let appSyncClients = {};
  const userMap = {};

  beforeAll(async () => {
    console.log(sqlCreateStatements);
    projRoot = await createNewProjectDir(projName);
    await setupAmplifyProject();
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
      engine: 'mysql' as const,
      dbname: database,
      username,
      password,
      region,
    };

    const db = await setupRDSInstanceAndData(dbConfig, sqlCreateStatements);
    port = db.port;
    host = db.endpoint;
  };

  const cleanupDatabase = async (): Promise<void> => {
    await deleteDBInstance(identifier, region);
  };

  const setupAmplifyProject = async (): Promise<void> => {
    const apiName = projName;
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
      name: projName,
    });

    const metaAfterInit = getProjectMeta(projRoot);
    region = metaAfterInit.providers.awscloudformation.Region;

    await addApi(projRoot, {
      transformerVersion: 2,
      'Amazon Cognito User Pool': {},
      'API key': {},
    });
    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
    const ddbSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.graphql');
    removeSync(ddbSchemaFilePath);

    await setupDatabase();
    await importRDSDatabase(projRoot, {
      database,
      host,
      port,
      username,
      password,
      useVpc: true,
      apiExists: true,
    });
    writeFileSync(rdsSchemaFilePath, appendAmplifyInput(schema, ImportedRDSType.MYSQL), 'utf8');

    await updateAuthAddUserGroups(projRoot, [adminGroupName, devGroupName, moderatorGroupName]);
    await amplifyPush(projRoot, false, {
      useBetaSqlLayer: SQL_TESTS_USE_BETA,
    });
    await sleep(2 * 60 * 1000); // Wait for 2 minutes for the VPC endpoints to be live.

    const userPoolId = getUserPoolId(projRoot);
    configureAmplify(projRoot);
    await setupUser(userPoolId, userName1, userPassword, adminGroupName);
    await setupUser(userPoolId, userName2, userPassword, devGroupName);
    await setupUser(userPoolId, userName3, userPassword, moderatorGroupName);
    graphQlEndpoint = getAppSyncEndpoint(projRoot, apiName);
    const user1 = await signInUser(userName1, userPassword);
    userMap[userName1] = user1;
    const user2 = await signInUser(userName2, userPassword);
    userMap[userName2] = user2;
    const user3 = await signInUser(userName3, userPassword);
    userMap[userName3] = user3;
    appSyncClients = await configureAppSyncClients(projRoot, apiName, [userPoolProvider, apiKeyProvider], userMap);
  };

  test('HasMany relationship with multiple auth rules', async () => {
    const parentModel = 'Blog';
    const childModel = 'Post';
    const ownerBlogHelper = constructBlogHelper(appSyncClients[userPoolProvider][userName1]);
    const privateBlogHelper = constructBlogHelper(appSyncClients[userPoolProvider][userName2]);
    const publicBlogHelper = constructBlogHelper(appSyncClients['apiKey']);
    const ownerPostHelper = constructPostHelper(appSyncClients[userPoolProvider][userName1]);
    const privatePostHelper = constructPostHelper(appSyncClients[userPoolProvider][userName2]);
    const publicPostHelper = constructPostHelper(appSyncClients['apiKey']);

    const blog = {
      id: Date.now().toString(),
      content: 'my blog',
      authors: [userName1],
    };
    const post1 = {
      id: Date.now().toString(),
      content: 'my post 1',
      owner: userName1,
      blogId: blog.id,
    };
    const post2 = {
      id: (Date.now() + 101).toString(),
      content: 'my post 2',
      owner: userName1,
      blogId: blog.id,
    };

    // non-owners cannot create blogs
    await expect(privateBlogHelper.create(`create${parentModel}`, blog)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access createBlog on type Mutation"`,
    );
    await expect(publicBlogHelper.create(`create${parentModel}`, blog)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access createBlog on type Mutation"`,
    );

    // owner can create blogs
    const createBlogResult = await ownerBlogHelper.create(`create${parentModel}`, blog);
    checkOperationResult(createBlogResult, blog, `create${parentModel}`);

    const blogUpdated = {
      ...blog,
      content: 'my blog updated',
    };
    const post1Updated = {
      ...post1,
      content: 'my post 1 updated',
    };
    const post2Updated = {
      ...post2,
      content: 'my post 2 updated',
    };

    // non-owner cannot update blogs
    await expect(privateBlogHelper.update(`update${parentModel}`, blogUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access updateBlog on type Mutation"`,
    );
    await expect(publicBlogHelper.update(`update${parentModel}`, blogUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access updateBlog on type Mutation"`,
    );

    // owner can update blogs
    const updateBlogResult = await ownerBlogHelper.update(`update${parentModel}`, blogUpdated);
    checkOperationResult(updateBlogResult, blogUpdated, `update${parentModel}`);

    // non-owner cannot create posts
    await expect(privatePostHelper.create(`create${childModel}`, post1)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access createPost on type Mutation"`,
    );
    await expect(publicPostHelper.create(`create${childModel}`, post1)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access createPost on type Mutation"`,
    );

    // owner can create connected posts
    const createPost1Result = await ownerPostHelper.create(`create${childModel}`, post1);
    checkOperationResult(createPost1Result, post1, `create${childModel}`);
    const createPost2Result = await ownerPostHelper.create(`create${childModel}`, post2);
    checkOperationResult(createPost2Result, post2, `create${childModel}`);

    // public client cannot update posts
    await expect(publicPostHelper.update(`update${childModel}`, post1Updated)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access updatePost on type Mutation"`,
    );
    // private client can update posts
    const updatePost1Result = await privatePostHelper.update(`update${childModel}`, post1Updated);
    checkOperationResult(updatePost1Result, post1Updated, `update${childModel}`);
    // owner can update posts
    const updatePost2Result = await ownerPostHelper.update(`update${childModel}`, post2Updated);
    checkOperationResult(updatePost2Result, post2Updated, `update${childModel}`);

    const expectedGetBlogResult = {
      ...blogUpdated,
      posts: {
        __typename: 'ModelPostConnection',
        items: [
          { ...post1Updated, __typename: 'Post' },
          { ...post2Updated, __typename: 'Post' },
        ],
      },
    };
    // public client can get blogs with connected posts
    const getBlogPublicResult = await publicBlogHelper.get({
      id: blog.id,
    });
    checkOperationResult(getBlogPublicResult, expectedGetBlogResult, `get${parentModel}`);
    // private client can get blogs with connected posts
    const getBlogPrivateResult = await privateBlogHelper.get({
      id: blog.id,
    });
    checkOperationResult(getBlogPrivateResult, expectedGetBlogResult, `get${parentModel}`);

    // public client cannot list blogs
    await expect(publicBlogHelper.list()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access listBlogs on type Query"`,
    );
    // private client can list blogs
    const listBlogPrivateResult = await privateBlogHelper.list();
    checkListItemExistence(listBlogPrivateResult, `list${parentModel}s`, blog.id, true);

    const expectedGetPostResult = {
      ...post1Updated,
      blog: {
        ...blogUpdated,
        __typename: 'Blog',
      },
    };

    // public client cannot get posts
    await expect(
      publicPostHelper.get({
        id: post1.id,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getPost on type Query"`);
    // private client can get posts and parent blog
    const getPostPrivateResult = await privatePostHelper.get({
      id: post1.id,
    });
    checkOperationResult(getPostPrivateResult, expectedGetPostResult, `get${childModel}`);

    // public client can list posts with parent blog
    const listPostsPublicResult = await publicPostHelper.list();
    checkListItemExistence(listPostsPublicResult, `list${childModel}s`, post1.id, true);
    checkListItemExistence(listPostsPublicResult, `list${childModel}s`, post2.id, true);

    // public client cannot delete blogs
    await expect(publicBlogHelper.delete(`delete${parentModel}`, { id: blog.id })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access deleteBlog on type Mutation"`,
    );
    // private client can delete blogs
    const deleteBlogPrivateResult = await privateBlogHelper.delete(`delete${parentModel}`, { id: blog.id });
    checkOperationResult(deleteBlogPrivateResult, blogUpdated, `delete${parentModel}`);

    // public client cannot delete posts
    await expect(publicPostHelper.delete(`delete${childModel}`, { id: post1.id })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access deletePost on type Mutation"`,
    );
    // non-owner cannot delete a post
    await expect(privatePostHelper.delete(`delete${childModel}`, { id: post2.id })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access deletePost on type Mutation"`,
    );
    // owner can delete a post
    const deletePost1Result = await ownerPostHelper.delete(`delete${childModel}`, { id: post1.id });
    checkOperationResult(deletePost1Result, post1Updated, `delete${childModel}`);
  });

  test('HasOne relationship with multiple auth rules', async () => {
    const parentModel = 'User';
    const childModel = 'Profile';
    const adminUserHelper = constructUserHelper(appSyncClients[userPoolProvider][userName1]);
    const devUserHelper = constructUserHelper(appSyncClients[userPoolProvider][userName2]);
    const moderatorUserHelper = constructUserHelper(appSyncClients[userPoolProvider][userName3]);
    const publicUserHelper = constructUserHelper(appSyncClients['apiKey']);
    const adminProfileHelper = constructProfileHelper(appSyncClients[userPoolProvider][userName1]);
    const devProfileHelper = constructProfileHelper(appSyncClients[userPoolProvider][userName2]);
    const moderatorProfileHelper = constructProfileHelper(appSyncClients[userPoolProvider][userName3]);
    const publicProfileHelper = constructProfileHelper(appSyncClients['apiKey']);

    const user = {
      id: Date.now().toString(),
      name: 'my name',
      groupField: moderatorGroupName,
    };
    const profile = {
      id: Date.now().toString(),
      details: 'my details',
      groupsField: [moderatorGroupName],
      userId: user.id,
    };

    // non-admins cannot create users
    await expect(devUserHelper.create(`create${parentModel}`, user)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access createUser on type Mutation"`,
    );
    await expect(moderatorUserHelper.create(`create${parentModel}`, user)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access createUser on type Mutation"`,
    );
    await expect(publicUserHelper.create(`create${parentModel}`, user)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access createUser on type Mutation"`,
    );

    // admins can create users
    const createAdminUserResult = await adminUserHelper.create(`create${parentModel}`, user);
    checkOperationResult(createAdminUserResult, user, `create${parentModel}`);

    const userUpdated = {
      ...user,
      name: 'my name updated',
    };
    const profileUpdated = {
      ...profile,
      details: 'my details updated',
    };

    // only admins and users authorized via dynamic group field can update users
    await expect(devUserHelper.update(`update${parentModel}`, userUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access updateUser on type Mutation"`,
    );
    await expect(publicUserHelper.update(`update${parentModel}`, userUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access updateUser on type Mutation"`,
    );
    const updateAdminUserResult = await adminUserHelper.update(`update${parentModel}`, userUpdated);
    checkOperationResult(updateAdminUserResult, userUpdated, `update${parentModel}`);
    const updateModeratorUserResult = await moderatorUserHelper.update(`update${parentModel}`, userUpdated);
    checkOperationResult(updateModeratorUserResult, userUpdated, `update${parentModel}`);

    // public user cannot create profiles
    await expect(publicProfileHelper.create(`create${childModel}`, profile)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access createProfile on type Mutation"`,
    );

    // Dev user can create and delete profiles
    const createDevProfileResult = await devProfileHelper.create(`create${childModel}`, profile);
    checkOperationResult(createDevProfileResult, profile, `create${childModel}`);
    const deleteDevProfileResult = await devProfileHelper.delete(`delete${childModel}`, { id: profile.id });
    checkOperationResult(deleteDevProfileResult, profile, `delete${childModel}`);

    // user authorized with dynamic group field can create profiles
    const createModeratorProfileResult = await moderatorProfileHelper.create(`create${childModel}`, profile);
    checkOperationResult(createModeratorProfileResult, profile, `create${childModel}`);

    // admin user can delete profiles
    const deleteAdminProfileResult = await adminProfileHelper.delete(`delete${childModel}`, { id: profile.id });
    checkOperationResult(deleteAdminProfileResult, profile, `delete${childModel}`);

    // admin user can create profiles
    const createAdminProfileResult = await adminProfileHelper.create(`create${childModel}`, profile);
    checkOperationResult(createAdminProfileResult, profile, `create${childModel}`);

    // only dev and admin users can update profiles
    await expect(moderatorProfileHelper.update(`update${childModel}`, profileUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access updateProfile on type Mutation"`,
    );
    await expect(publicProfileHelper.update(`update${childModel}`, profileUpdated)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access updateProfile on type Mutation"`,
    );
    const updateDevProfileResult = await devProfileHelper.update(`update${childModel}`, profileUpdated);
    checkOperationResult(updateDevProfileResult, profileUpdated, `update${childModel}`);
    const updateAdminProfileResult = await adminProfileHelper.update(`update${childModel}`, profileUpdated);
    checkOperationResult(updateAdminProfileResult, profileUpdated, `update${childModel}`);

    const expectedGetUserResult = {
      ...userUpdated,
      profile: {
        __typename: 'Profile',
        ...profileUpdated,
      },
    };

    // public client can get users with connected profiles
    const getUserPublicResult = await publicUserHelper.get({
      id: user.id,
    });
    checkOperationResult(getUserPublicResult, expectedGetUserResult, `get${parentModel}`);
    // users authorized with dynamic group field cannot get users
    await expect(
      moderatorUserHelper.get({
        id: user.id,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getUser on type Query"`);
    // dev user can get users with connected profiles
    const getUserDevResult = await devUserHelper.get({
      id: user.id,
    });
    checkOperationResult(getUserDevResult, expectedGetUserResult, `get${parentModel}`);
    // admin user can get users with connected profiles
    const getUserAdminResult = await adminUserHelper.get({
      id: user.id,
    });
    checkOperationResult(getUserAdminResult, expectedGetUserResult, `get${parentModel}`);

    // public client cannot list users
    await expect(publicUserHelper.list()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access listUsers on type Query"`,
    );
    // users authorized with dynamic group field cannot list users
    await expect(moderatorUserHelper.list()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access listUsers on type Query"`,
    );
    // dev user can list users
    const listUserDevResult = await devUserHelper.list();
    checkListItemExistence(listUserDevResult, `list${parentModel}s`, user.id, true);
    // admin user can list users
    const listUserAdminResult = await adminUserHelper.list();
    checkListItemExistence(listUserAdminResult, `list${parentModel}s`, user.id, true);

    const expectedGetProfileResult = {
      ...profileUpdated,
      user: {
        ...userUpdated,
        __typename: 'User',
      },
    };

    // public client cannot get profiles
    await expect(
      publicProfileHelper.get({
        id: profile.id,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access getProfile on type Query"`);
    // users authorized with dynamic group field cannot get users from profiles
    await expect(
      moderatorProfileHelper.get({
        id: profile.id,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access user on type Profile"`);

    // dev user can get profiles
    const getProfileDevResult = await devProfileHelper.get({
      id: profile.id,
    });
    checkOperationResult(getProfileDevResult, expectedGetProfileResult, `get${childModel}`);
    // admin user can get profiles
    const getProfileAdminResult = await adminProfileHelper.get({
      id: profile.id,
    });
    checkOperationResult(getProfileAdminResult, expectedGetProfileResult, `get${childModel}`);

    // public client can list profiles
    const listProfilesPublicResult = await publicProfileHelper.list();
    checkListItemExistence(listProfilesPublicResult, `list${childModel}s`, profile.id, true);
    // users authorized with dynamic group field cannot get users from profiles
    await expect(moderatorProfileHelper.list()).rejects.toThrowError();
    // dev user cannot list profiles
    const listProfilesDevResult = await devProfileHelper.list();
    checkListItemExistence(listProfilesDevResult, `list${childModel}s`, profile.id);
    // admin user can list profiles
    const listProfilesAdminResult = await adminProfileHelper.list();
    checkListItemExistence(listProfilesAdminResult, `list${childModel}s`, profile.id, true);

    // public client cannot delete users
    await expect(publicUserHelper.delete(`delete${parentModel}`, { id: user.id })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access deleteUser on type Mutation"`,
    );
    // dev users cannot delete users
    await expect(devUserHelper.delete(`delete${parentModel}`, { id: user.id })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"GraphQL error: Not Authorized to access deleteUser on type Mutation"`,
    );
    // users authorized with dynamic group field can delete users
    const deleteModeratorUserResult = await moderatorUserHelper.delete(`delete${parentModel}`, { id: user.id });
    checkOperationResult(deleteModeratorUserResult, userUpdated, `delete${parentModel}`);
  });

  const constructBlogHelper = (appsyncClient: any): GQLQueryHelper => {
    const createSelectionSet = /* GraphQL */ `
        id
        content
        authors
      `;
    const updateSelectionSet = createSelectionSet;
    const deleteSelectionSet = createSelectionSet;
    const getSelectionSet = /* GraphQL */ `
      query GetBlog($id: String!) {
        getBlog(id: $id) {
          id
          content
          authors
          posts {
            items {
              id
              content
              owner
              blogId
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
            authors
            posts {
              items {
                id
                content
                owner
                blogId
              }
            }
          }
        }
      }
    `;
    const helper = new GQLQueryHelper(appsyncClient, 'Blog', {
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

  const constructPostHelper = (appsyncClient: any): GQLQueryHelper => {
    const createSelectionSet = /* GraphQL */ `
        id
        content
        owner
        blogId
      `;
    const updateSelectionSet = createSelectionSet;
    const deleteSelectionSet = createSelectionSet;
    const getSelectionSet = /* GraphQL */ `
      query GetPost($id: String!) {
        getPost(id: $id) {
          id
          content
          owner
          blogId
          blog {
            id
            content
            authors
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
            owner
            blogId
            blog {
              id
              content
              authors
            }
          }
        }
      }
    `;
    const helper = new GQLQueryHelper(appsyncClient, 'Post', {
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

  const constructUserHelper = (appsyncClient: any): GQLQueryHelper => {
    const createSelectionSet = /* GraphQL */ `
        id
        name
        groupField
      `;
    const updateSelectionSet = createSelectionSet;
    const deleteSelectionSet = createSelectionSet;
    const getSelectionSet = /* GraphQL */ `
      query GetUser($id: String!) {
        getUser(id: $id) {
          id
          name
          groupField
          profile {
            id
            details
            groupsField
            userId
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
            groupField
            profile {
              id
              details
              groupsField
              userId
            }
          }
        }
      }
    `;
    const helper = new GQLQueryHelper(appsyncClient, 'User', {
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

  const constructProfileHelper = (appsyncClient: any): GQLQueryHelper => {
    const createSelectionSet = /* GraphQL */ `
        id
        details
        groupsField
        userId
      `;
    const updateSelectionSet = createSelectionSet;
    const deleteSelectionSet = createSelectionSet;
    const getSelectionSet = /* GraphQL */ `
      query GetProfile($id: String!) {
        getProfile(id: $id) {
          id
          details
          groupsField
          userId
          user {
            id
            name
            groupField
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
            groupsField
            userId
            user {
              id
              name
              groupField
            }
          }
        }
      }
    `;
    const helper = new GQLQueryHelper(appsyncClient, 'Profile', {
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

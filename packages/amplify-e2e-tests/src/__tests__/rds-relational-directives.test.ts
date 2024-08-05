import {
  addApiWithoutSchema,
  amplifyPush,
  apiGenerateSchema,
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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import { gql } from 'graphql-transformer-core';
import path from 'path';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import { SQL_TESTS_USE_BETA } from '../rds-v2-tests-common/sql-e2e-config';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe('RDS Relational Directives', () => {
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  let region = 'us-east-1';
  let port = 3306;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const projName = 'rdsmodelapitest';

  let projRoot;
  let appSyncClient;

  beforeAll(async () => {
    projRoot = await createNewProjectDir('rdsmodelapi');
    await initProjectAndImportSchema();
    await amplifyPush(projRoot, false, {
      useBetaSqlLayer: SQL_TESTS_USE_BETA,
    });
    await sleep(2 * 60 * 1000); // Wait for 2 minutes for the VPC endpoints to be live.

    const meta = getProjectMeta(projRoot);
    const appRegion = meta.providers.awscloudformation.Region;
    const { output } = meta.api.rdsrelationalapi;
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
      engine: 'mysql' as const,
      dbname: database,
      username,
      password,
      region,
    };
    const queries = [
      'CREATE TABLE Blog (id VARCHAR(40) PRIMARY KEY, content VARCHAR(255))',
      'CREATE TABLE Post (id VARCHAR(40) PRIMARY KEY, content VARCHAR(255), blogId VARCHAR(40))',
      'CREATE TABLE User (id VARCHAR(40) PRIMARY KEY, name VARCHAR(255))',
      'CREATE TABLE Profile (id VARCHAR(40) PRIMARY KEY, details VARCHAR(255), userId VARCHAR(40))',
      'CREATE TABLE ZipCode (zip VARCHAR(40) PRIMARY KEY, city VARCHAR(255), state VARCHAR(255), country VARCHAR(255))',
      `
        CREATE PROCEDURE getCityByZip (zipcode VARCHAR(40))
        BEGIN 
            SELECT * FROM ZipCode WHERE zip = zipcode;
        end;
      `,
      "INSERT INTO ZipCode VALUES ('20158', 'Hamilton', 'VA', 'US')",
      "INSERT INTO ZipCode VALUES ('20160', 'Lincoln', 'VA', 'US')",
    ];

    const db = await setupRDSInstanceAndData(dbConfig, queries);
    port = db.port;
    host = db.endpoint;
  };

  const cleanupDatabase = async (): Promise<void> => {
    await deleteDBInstance(identifier, region);
  };

  const createSqlStatementsDirectory = (apiName: string): void => {
    const sqlStatementsDirPath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'sql-statements');
    if (!existsSync(sqlStatementsDirPath)) {
      mkdirSync(sqlStatementsDirPath);
    }
  };

  const createSqlStatementFile = (apiName: string, statement: string, fileName: string): void => {
    const sqlStatementsDirPath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'sql-statements');
    const scriptFilePath = path.join(sqlStatementsDirPath, `${fileName}.sql`);
    writeFileSync(scriptFilePath, statement);
  };

  const initProjectAndImportSchema = async (): Promise<void> => {
    const apiName = 'rdsrelationalapi';
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
        engine: String = "mysql"
        globalAuthRule: AuthRule = { allow: public }
      }
      type Blog @model {
        id: String! @primaryKey
        content: String
        posts: [Post] @hasMany(references: ["blogId"])
      }
      type Post @model {
        id: String! @primaryKey
        content: String
        blogId: String!
        blog: Blog @belongsTo(references: ["blogId"])
      }
      type User @model {
        id: String! @primaryKey
        name: String
        profile: Profile @hasOne(references: ["userId"])
      }
      type Profile @model {
        id: String! @primaryKey
        details: String
        userId: String!
        user: User @belongsTo(references: ["userId"])
      }
      type ZipCode {
        zip: String!
        city: String
        state: String
        country: String
      }
      type Query {
        getCityByZipStatement(zip: String!): [ZipCode] @sql(statement: "SELECT * FROM ZipCode WHERE zip = :zip")
        getCityByZip(zipcode: String!): [ZipCode] @sql(reference: "getCityByZip")
      }
    `;
    writeFileSync(rdsSchemaFilePath, schema, 'utf8');

    // Create SQL scripts
    createSqlStatementsDirectory(apiName);
    createSqlStatementFile(apiName, 'CALL getCityByZip(:zipcode)', 'getCityByZip');
  };

  test('check hasMany and belongsTo directives on blog and post tables', async () => {
    const blogHelper = constructBlogHelper();
    const postHelper = constructPostHelper();

    await blogHelper.create('createBlog', {
      id: 'B-1',
      content: 'Blog 1',
    });
    await blogHelper.create('createBlog', {
      id: 'B-2',
      content: 'Blog 2',
    });
    await blogHelper.create('createBlog', {
      id: 'B-3',
      content: 'Blog 3',
    });

    await postHelper.create('createPost', {
      id: 'P-1A',
      content: 'Post 1A',
      blogId: 'B-1',
    });
    await postHelper.create('createPost', {
      id: 'P-1B',
      content: 'Post 1B',
      blogId: 'B-1',
    });
    await postHelper.create('createPost', {
      id: 'P-1C',
      content: 'Post 1C',
      blogId: 'B-1',
    });
    await postHelper.create('createPost', {
      id: 'P-2A',
      content: 'Post 2A',
      blogId: 'B-2',
    });
    await postHelper.create('createPost', {
      id: 'P-2B',
      content: 'Post 2B',
      blogId: 'B-2',
    });
    await postHelper.create('createPost', {
      id: 'P-3A',
      content: 'Post 3A',
      blogId: 'B-3',
    });

    const getBlog1 = await blogHelper.get({
      id: 'B-1',
    });
    expect(getBlog1.data.getBlog.id).toEqual('B-1');
    expect(getBlog1.data.getBlog.content).toEqual('Blog 1');
    expect(getBlog1.data.getBlog.posts.items.length).toEqual(3);
    expect(getBlog1.data.getBlog.posts.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'P-1A', content: 'Post 1A' }),
        expect.objectContaining({ id: 'P-1B', content: 'Post 1B' }),
        expect.objectContaining({ id: 'P-1C', content: 'Post 1C' }),
      ]),
    );

    const getBlog2 = await blogHelper.get({
      id: 'B-2',
    });
    expect(getBlog2.data.getBlog.id).toEqual('B-2');
    expect(getBlog2.data.getBlog.content).toEqual('Blog 2');
    expect(getBlog2.data.getBlog.posts.items.length).toEqual(2);
    expect(getBlog2.data.getBlog.posts.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'P-2A', content: 'Post 2A' }),
        expect.objectContaining({ id: 'P-2B', content: 'Post 2B' }),
      ]),
    );

    const getBlog3 = await blogHelper.get({
      id: 'B-3',
    });
    expect(getBlog3.data.getBlog.id).toEqual('B-3');
    expect(getBlog3.data.getBlog.content).toEqual('Blog 3');
    expect(getBlog3.data.getBlog.posts.items.length).toEqual(1);
    expect(getBlog3.data.getBlog.posts.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'P-3A', content: 'Post 3A' })]),
    );

    const listBlogs = await blogHelper.list();
    expect(listBlogs.data.listBlogs.items.length).toEqual(3);
    expect(listBlogs.data.listBlogs.items).toEqual(
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

    const getPost1A = await postHelper.get({
      id: 'P-1A',
    });
    expect(getPost1A.data.getPost.id).toEqual('P-1A');
    expect(getPost1A.data.getPost.content).toEqual('Post 1A');
    expect(getPost1A.data.getPost.blog).toBeDefined();
    expect(getPost1A.data.getPost.blog.id).toEqual('B-1');
    expect(getPost1A.data.getPost.blog.content).toEqual('Blog 1');

    const listPosts = await postHelper.list();
    expect(listPosts.data.listPosts.items.length).toEqual(6);
    expect(listPosts.data.listPosts.items).toEqual(
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
  });

  test('check hasOne and belongsTo directives on user and profile tables', async () => {
    const userHelper = constructUserHelper();
    const profileHelper = constructProfileHelper();

    await userHelper.create('createUser', {
      id: 'U-1',
      name: 'User 1',
    });
    await userHelper.create('createUser', {
      id: 'U-2',
      name: 'User 2',
    });
    await userHelper.create('createUser', {
      id: 'U-3',
      name: 'User 3',
    });

    await profileHelper.create('createProfile', {
      id: 'P-1',
      details: 'Profile 1',
      userId: 'U-1',
    });
    await profileHelper.create('createProfile', {
      id: 'P-2',
      details: 'Profile 2',
      userId: 'U-2',
    });

    const getUser1 = await userHelper.get({
      id: 'U-1',
    });
    expect(getUser1.data.getUser.id).toEqual('U-1');
    expect(getUser1.data.getUser.name).toEqual('User 1');
    expect(getUser1.data.getUser.profile).toBeDefined();
    expect(getUser1.data.getUser.profile.id).toEqual('P-1');
    expect(getUser1.data.getUser.profile.details).toEqual('Profile 1');

    const getUser3 = await userHelper.get({
      id: 'U-3',
    });
    expect(getUser3.data.getUser.id).toEqual('U-3');
    expect(getUser3.data.getUser.name).toEqual('User 3');
    expect(getUser3.data.getUser.profile).toBeNull();

    const listUsers = await userHelper.list();
    expect(listUsers.data.listUsers.items.length).toEqual(3);
    expect(listUsers.data.listUsers.items).toEqual(
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

    const getProfile1 = await profileHelper.get({
      id: 'P-1',
    });
    expect(getProfile1.data.getProfile.id).toEqual('P-1');
    expect(getProfile1.data.getProfile.details).toEqual('Profile 1');
    expect(getProfile1.data.getProfile.user).toBeDefined();
    expect(getProfile1.data.getProfile.user.id).toEqual('U-1');
    expect(getProfile1.data.getProfile.user.name).toEqual('User 1');

    const listProfiles = await profileHelper.list();
    expect(listProfiles.data.listProfiles.items.length).toEqual(2);
    expect(listProfiles.data.listProfiles.items).toEqual(
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
  });

  test('@sql statement and reference should work', async () => {
    // Validate @sql statement option
    const sqlStatementQuery = /* GraphQL */ `
      query GetCityByZipStatement($zip: String!) {
        getCityByZipStatement(zip: $zip) {
          zip
          city
          state
          country
        }
      }
    `;

    const parameters = {
      zip: '20158',
    };

    const result = await appSyncClient.query({
      query: gql`
        ${sqlStatementQuery}
      `,
      fetchPolicy: 'no-cache',
      variables: parameters,
    });

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.getCityByZipStatement).toBeDefined();
    expect(result.data.getCityByZipStatement).toHaveLength(1);
    expect(result.data.getCityByZipStatement).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          zip: '20158',
          city: 'Hamilton',
          state: 'VA',
          country: 'US',
        }),
      ]),
    );

    // Verify reference argument and stored procedure call which produce output
    const sqlReferenceQuery = /* GraphQL */ `
      query GetCityByZip($zipcode: String!) {
        getCityByZip(zipcode: $zipcode) {
          zip
          city
          state
          country
        }
      }
    `;

    const referenceParameters = {
      zipcode: '20160',
    };

    const referenceResult = await appSyncClient.query({
      query: gql`
        ${sqlReferenceQuery}
      `,
      fetchPolicy: 'no-cache',
      variables: referenceParameters,
    });

    expect(referenceResult).toBeDefined();
    expect(referenceResult.data).toBeDefined();
    expect(referenceResult.data.getCityByZip).toBeDefined();
    expect(referenceResult.data.getCityByZip).toHaveLength(1);
    expect(referenceResult.data.getCityByZip).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          zip: '20160',
          city: 'Lincoln',
          state: 'VA',
          country: 'US',
        }),
      ]),
    );

    // Validate stored procedure call with no output
    const noItemsParameters = {
      zipcode: '12345',
    };

    const noItemsResult = await appSyncClient.query({
      query: gql`
        ${sqlReferenceQuery}
      `,
      fetchPolicy: 'no-cache',
      variables: noItemsParameters,
    });

    expect(noItemsResult).toBeDefined();
    expect(noItemsResult.data).toBeDefined();
    expect(noItemsResult.data.getCityByZip).toBeDefined();
    expect(noItemsResult.data.getCityByZip).toHaveLength(0);
  });

  test('relational directives should be preserved on regenerate schema', async () => {
    await apiGenerateSchema(projRoot, {
      database,
      host,
      port,
      username,
      password,
      validCredentials: true,
      useVpc: true,
    });
    const apiName = 'rdsrelationalapi';
    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
    const regeneratedSchema = readFileSync(rdsSchemaFilePath, 'utf8');
    const schema = parse(regeneratedSchema);

    // Check posts field on Blog type
    const blogType = schema.definitions.find(
      (def) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Blog',
    ) as ObjectTypeDefinitionNode;
    expect(blogType).toBeDefined();
    const blogPostsField = blogType.fields.find((field) => field.name.value === 'posts');
    expect(blogPostsField).toBeDefined();
    const blogsPostsDirective = blogPostsField.directives.find((directive) => directive.name.value === 'hasMany');
    expect(blogsPostsDirective).toBeDefined();

    // Check posts field on Blog type
    const postType = schema.definitions.find(
      (def) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Post',
    ) as ObjectTypeDefinitionNode;
    expect(postType).toBeDefined();
    const postBlogField = postType.fields.find((field) => field.name.value === 'blog');
    expect(postBlogField).toBeDefined();
    const postBlogDirective = postBlogField.directives.find((directive) => directive.name.value === 'belongsTo');
    expect(postBlogDirective).toBeDefined();

    // Check profile field on User type
    const userType = schema.definitions.find(
      (def) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'User',
    ) as ObjectTypeDefinitionNode;
    expect(userType).toBeDefined();
    const userProfileField = userType.fields.find((field) => field.name.value === 'profile');
    expect(userProfileField).toBeDefined();
    const userProfileDirective = userProfileField.directives.find((directive) => directive.name.value === 'hasOne');
    expect(userProfileDirective).toBeDefined();

    // Check profile field on User type
    const profileType = schema.definitions.find(
      (def) => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Profile',
    ) as ObjectTypeDefinitionNode;
    expect(profileType).toBeDefined();
    const profileUserField = profileType.fields.find((field) => field.name.value === 'user');
    expect(profileUserField).toBeDefined();
    const profileUserDirective = profileUserField.directives.find((directive) => directive.name.value === 'belongsTo');
    expect(profileUserDirective).toBeDefined();
  });

  const constructBlogHelper = (): GQLQueryHelper => {
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
    const helper = new GQLQueryHelper(appSyncClient, 'Blog', {
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

  const constructPostHelper = (): GQLQueryHelper => {
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
    const helper = new GQLQueryHelper(appSyncClient, 'Post', {
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

  const constructUserHelper = (): GQLQueryHelper => {
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
    const helper = new GQLQueryHelper(appSyncClient, 'User', {
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

  const constructProfileHelper = (): GQLQueryHelper => {
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
    const helper = new GQLQueryHelper(appSyncClient, 'Profile', {
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

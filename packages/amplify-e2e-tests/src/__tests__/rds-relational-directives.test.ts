import {
  RDSTestDataProvider,
  addApiWithoutSchema,
  addRDSPortInboundRule,
  amplifyPush,
  createNewProjectDir,
  createRDSInstance,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta, importRDSDatabase, initJSProjectWithProfile,
  removeRDSPortInboundRule
} from 'amplify-category-api-e2e-core';
import { existsSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import path from 'path';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');

describe("RDS Relational Directives", () => {
  const publicIpCidr = "0.0.0.0/0";
  const [db_user, db_password, db_identifier] = generator.generateMultiple(3);
  
  // Generate settings for RDS instance
  const username = db_user;
  const password = db_password;
  const region = 'us-east-1';
  let port = 3306;
  const database = 'default_db';
  let host = 'localhost';
  const identifier = `integtest${db_identifier}`;
  const projName = 'rdsmodelapitest';

  let projRoot;
  let appSyncClient;

  beforeAll(async () => {
    projRoot = await createNewProjectDir('rdsmodelapi');
    await setupDatabase();
    await initProjectAndImportSchema();
    await amplifyPush(projRoot);

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
    // This test performs the below
    // 1. Create a RDS Instance
    // 2. Add the external IP address of the current machine to security group inbound rule to allow public access
    // 3. Connect to the database and execute DDL

    const db = await createRDSInstance({
      identifier,
      engine: 'mysql',
      dbname: database,
      username,
      password,
      region,
    });
    port = db.port;
    host = db.endpoint;
    await addRDSPortInboundRule({
      region,
      port: db.port,
      cidrIp: publicIpCidr,
    });

    const dbAdapter = new RDSTestDataProvider({
      host: db.endpoint,
      port: db.port,
      username,
      password,
      database: db.dbName,
    });

    await dbAdapter.runQuery([
      'CREATE TABLE Blog (id VARCHAR(40) PRIMARY KEY, content VARCHAR(255))',
      'CREATE TABLE Post (id VARCHAR(40) PRIMARY KEY, content VARCHAR(255), blogId VARCHAR(40))',
    ]);
    dbAdapter.cleanup();
  };

  const cleanupDatabase = async (): Promise<void> => {
    // 1. Remove the IP address from the security group
    // 2. Delete the RDS instance
    await removeRDSPortInboundRule({
      region,
      port: port,
      cidrIp: publicIpCidr,
    });
    await deleteDBInstance(identifier, region);
  };

  const initProjectAndImportSchema = async (): Promise<void> => {
    const apiName = 'rdsrelationalapi';
    await initJSProjectWithProfile(projRoot, {
      disableAmplifyAppCreation: false,
      name: projName,
    });
    const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.rds.graphql');

    await addApiWithoutSchema(projRoot, { transformerVersion: 2, apiName });
    
    await importRDSDatabase(projRoot, {
      database,
      host,
      port,
      username,
      password,
      useVpc: false,
      apiExists: true,
    });
    
    const schema = /* GraphQL */ `
      input AMPLIFY {
        engine: String = "mysql"
        globalAuthRule: AuthRule = {allow: public}
      }
      type Blog @model {
        id: String! @primaryKey
        content: String
        posts: [Post] @hasMany(references: ["blogId"])
      }
      type Post @model {
        id: String! @primaryKey
        content: String
        blogId: String
      }
    `;
    writeFileSync(rdsSchemaFilePath, schema, 'utf8');
  };

  test('check hasMany field on blog table', async () => {
    await createBlog('B-1', 'Blog 1');
    await createBlog('B-2', 'Blog 2');
    await createBlog('B-3', 'Blog 3');

    await createPost('P-1A', 'Post 1A', 'B-1');
    await createPost('P-1B', 'Post 1B', 'B-1');
    await createPost('P-1C', 'Post 1C', 'B-1');
    await createPost('P-2A', 'Post 2A', 'B-2');
    await createPost('P-2B', 'Post 2B', 'B-2');
    await createPost('P-3A', 'Post 3A', 'B-3');

    const getBlog1 = await getBlog('B-1');
    expect(getBlog1.data.getBlog.id).toEqual('B-1');
    expect(getBlog1.data.getBlog.content).toEqual('Blog 1');
    expect(getBlog1.data.getBlog.posts.items.length).toEqual(3);
    expect(getBlog1.data.getBlog.posts.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'P-1A', content: 'Post 1A' }),
      expect.objectContaining({ id: 'P-1B', content: 'Post 1B' }),
      expect.objectContaining({ id: 'P-1C', content: 'Post 1C' }),
    ]));

    const getBlog2 = await getBlog('B-2');
    expect(getBlog2.data.getBlog.id).toEqual('B-2');
    expect(getBlog2.data.getBlog.content).toEqual('Blog 2');
    expect(getBlog2.data.getBlog.posts.items.length).toEqual(2);
    expect(getBlog2.data.getBlog.posts.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'P-2A', content: 'Post 2A' }),
      expect.objectContaining({ id: 'P-2B', content: 'Post 2B' }),
    ]));

    const getBlog3 = await getBlog('B-3');
    expect(getBlog3.data.getBlog.id).toEqual('B-3');
    expect(getBlog3.data.getBlog.content).toEqual('Blog 3');
    expect(getBlog3.data.getBlog.posts.items.length).toEqual(1);
    expect(getBlog3.data.getBlog.posts.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'P-3A', content: 'Post 3A' }),
    ]));
  });

  // CURDL on Blog table helpers
  const createBlog = async (id: string, content: string): Promise<any> => {
    const createMutation = /* GraphQL */ `
        mutation CreateBlog($input: CreateBlogInput!, $condition: ModelBlogConditionInput) {
          createBlog(input: $input, condition: $condition) {
            id
            content
          }
        }
      `;
    const createInput = {
      input: {
        id,
        content,
      },
    };
    const createResult: any = await appSyncClient.mutate({
      mutation: gql(createMutation),
      fetchPolicy: 'no-cache',
      variables: createInput,
    });

    return createResult;
  };

  const updateBlog = async (id: string, content: string): Promise<any> => {
    const updateMutation = /* GraphQL */ `
        mutation UpdateBlog($input: UpdateBlogInput!, $condition: ModelBlogConditionInput) {
          updateBlog(input: $input, condition: $condition) {
            id
            content
          }
        }
      `;
    const updateInput = {
      input: {
        id,
        content,
      },
    };
    const updateResult: any = await appSyncClient.mutate({
      mutation: gql(updateMutation),
      fetchPolicy: 'no-cache',
      variables: updateInput,
    });

    return updateResult;
  };

  const deleteBlog = async (id: string): Promise<any> => {
    const deleteMutation = /* GraphQL */ `
        mutation DeleteBlog($input: DeleteBlogInput!, $condition: ModelBlogConditionInput) {
          deleteBlog(input: $input, condition: $condition) {
            id
            content
          }
        }
      `;
    const deleteInput = {
      input: {
        id,
      },
    };
    const deleteResult: any = await appSyncClient.mutate({
      mutation: gql(deleteMutation),
      fetchPolicy: 'no-cache',
      variables: deleteInput,
    });

    return deleteResult;
  };

  const getBlog = async (id: string): Promise<any> => {
    const getQuery = /* GraphQL */ `
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
    const getInput = {
      id,
    };
    const getResult: any = await appSyncClient.query({
      query: gql(getQuery),
      fetchPolicy: 'no-cache',
      variables: getInput,
    });

    return getResult;
  };

  const listBlogs = async (): Promise<any> => {
    const listQuery = /* GraphQL */ `
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
    const listResult: any = await appSyncClient.query({
      query: gql(listQuery),
      fetchPolicy: 'no-cache',
    });

    return listResult;
  };

  // CURDL on Post table helpers
  const createPost = async (id: string, content: string, blogId: string): Promise<any> => {
    const createMutation = /* GraphQL */ `
        mutation CreatePost($input: CreatePostInput!, $condition: ModelPostConditionInput) {
          createPost(input: $input, condition: $condition) {
            id
            content
            blogId
          }
        }
      `;
    const createInput = {
      input: {
        id,
        content,
        blogId,
      },
    };
    const createResult: any = await appSyncClient.mutate({
      mutation: gql(createMutation),
      fetchPolicy: 'no-cache',
      variables: createInput,
    });

    return createResult;
  };

  const updatePost = async (id: string, content: string): Promise<any> => {
    const updateMutation = /* GraphQL */ `
        mutation UpdatePost($input: UpdatePostInput!, $condition: ModelPostConditionInput) {
          updatePost(input: $input, condition: $condition) {
            id
            content
          }
        }
      `;
    const updateInput = {
      input: {
        id,
        content,
      },
    };
    const updateResult: any = await appSyncClient.mutate({
      mutation: gql(updateMutation),
      fetchPolicy: 'no-cache',
      variables: updateInput,
    });

    return updateResult;
  };

  const deletePost = async (id: string): Promise<any> => {
    const deleteMutation = /* GraphQL */ `
        mutation DeletePost($input: DeletePostInput!, $condition: ModelPostConditionInput) {
          deletePost(input: $input, condition: $condition) {
            id
            content
          }
        }
      `;
    const deleteInput = {
      input: {
        id,
      },
    };
    const deleteResult: any = await appSyncClient.mutate({
      mutation: gql(deleteMutation),
      fetchPolicy: 'no-cache',
      variables: deleteInput,
    });

    return deleteResult;
  };

  const getPost = async (id: string): Promise<any> => {
    const getQuery = /* GraphQL */ `
        query GetPost($id: String!) {
          getPost(id: $id) {
            id
            content
          }
        }
      `;
    const getInput = {
      id,
    };
    const getResult: any = await appSyncClient.query({
      query: gql(getQuery),
      fetchPolicy: 'no-cache',
      variables: getInput,
    });

    return getResult;
  };

  const listPosts = async (limit = 100, nextToken: string | null = null, filter: any = null): Promise<any> => {
    const listQuery = /* GraphQL */ `
        query ListPosts($limit: Int, $nextToken: String, $filter: ModelPostFilterInput) {
          listPosts(limit: $limit, nextToken: $nextToken, filter: $filter) {
            items {
              id
              content
            }
            nextToken
          }
        }
      `;
    const listResult: any = await appSyncClient.query({
      query: gql(listQuery),
      fetchPolicy: 'no-cache',
      variables: {
        limit,
        nextToken,
        filter,
      },
    });

    return listResult;
  };
}); 

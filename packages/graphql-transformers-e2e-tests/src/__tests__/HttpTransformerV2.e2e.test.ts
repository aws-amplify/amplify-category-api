import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ResourceConstants } from 'graphql-transformer-common';
import { HttpTransformer } from '@aws-amplify/graphql-http-transformer';
import { Output } from 'aws-sdk/clients/cloudformation';
import { default as moment } from 'moment';
import { CloudFormationClient } from '../CloudFormationClient';
import { GraphQLClient } from '../GraphQLClient';
import { cleanupStackAfterTest, deploy } from '../deployNestedStacks';
import { S3Client } from '../S3Client';
import { deployJsonServer, destroyJsonServer } from '../cdkUtils';
import { resolveTestRegion } from '../testSetup';

const REGION = resolveTestRegion();

jest.setTimeout(2000000);

const cf = new CloudFormationClient(REGION);
const customS3Client = new S3Client(REGION);
const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const STACK_NAME = `HttpTransformerV2Test-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `appsync-http-transformer-v2-test-bucket-${BUILD_TIMESTAMP}`;
const LOCAL_FS_BUILD_DIR = '/tmp/http_transformer_v2_tests/';
const S3_ROOT_DIR_KEY = 'deployments';

let GRAPHQL_CLIENT = undefined;

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

beforeAll(async () => {
  const { apiUrl } = deployJsonServer();

  const validSchema = `
    type Comment @model {
        id: ID!
        title: String
        simpleGet: CompObj @http(method: GET, url: "${apiUrl}posts/1")
        simpleGet2: CompObj @http(url: "${apiUrl}posts/2")
        complexPost(
            id: Int,
            title: String!,
            body: String,
            userId: Int
        ): CompObj @http(method: POST, url: "${apiUrl}posts")
        complexPut(
            id: Int!,
            title: String,
            body: String,
            userId: Int
        ): CompObj @http(method: PUT, url: "${apiUrl}posts/:id")
        deleter: String @http(method: DELETE, url: "${apiUrl}posts/4")
        complexGet(
            data: String!,
            userId: Int!,
            _limit: Int
        ): [CompObj] @http(url: "${apiUrl}:data")
        complexGet2(
            dataType: String!,
            postId: Int!,
            secondType: String!,
            id: Int
        ): [PostComment] @http(url: "${apiUrl}:dataType/:postId/:secondType")
        configGet: ConfigResponse @http(
          method: GET,
          url: "${apiUrl}config/\${aws_region}/\${env}/\${!ctx.source.id}",
          headers: [{ key: "x-api-key", value: "fake-api-key" }]
        )
    }

    type Todo @model {
      id: ID!
      name: String
      note: Note
    }

    type Note {
      id: ID!
      simpleGet: CompObj @http(method: GET, url: "${apiUrl}posts/1")
      simpleGet2: CompObj @http(url: "${apiUrl}posts/2")
      complexPost(
          id: Int,
          title: String!,
          body: String,
          userId: Int
      ): CompObj @http(method: POST, url: "${apiUrl}posts")
      complexPut(
          id: Int!,
          title: String,
          body: String,
          userId: Int
      ): CompObj @http(method: PUT, url: "${apiUrl}posts/:id")
      deleter: String @http(method: DELETE, url: "${apiUrl}posts/4")
      complexGet(
          data: String!,
          userId: Int!,
          _limit: Int
      ): [CompObj] @http(url: "${apiUrl}:data")
      complexGet2(
          dataType: String!,
          postId: Int!,
          secondType: String!,
          id: Int
      ): [PostComment] @http(url: "${apiUrl}:dataType/:postId/:secondType")
      configGet: ConfigResponse @http(
        method: GET,
        url: "${apiUrl}config/\${aws_region}/\${env}/\${!ctx.source.id}",
        headers: [{ key: "x-api-key", value: "fake-api-key" }]
      )
    }

    type CompObj {
        userId: Int
        id: Int
        title: String
        body: String
    }
    type PostComment {
        postId: Int
        id: Int
        name: String
        email: String
        body: String
    }
    type ConfigResponse {
      apiKey: String
      env: String
      region: String
      commentId: String
    }
    `;

  try {
    await customS3Client.createBucket(BUCKET_NAME);
  } catch (e) {
    console.error(`Failed to create bucket: ${e}`);
    expect(true).toEqual(false);
  }

  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new HttpTransformer()],
    transformParameters: {
      sandboxModeEnabled: true,
    },
  });

  try {
    const finishedStack = await deploy(
      customS3Client,
      cf,
      STACK_NAME,
      out,
      {},
      LOCAL_FS_BUILD_DIR,
      BUCKET_NAME,
      S3_ROOT_DIR_KEY,
      BUILD_TIMESTAMP,
    );

    // Arbitrary wait to make sure everything is ready.
    await cf.wait(5, () => Promise.resolve());

    expect(finishedStack).toBeDefined();

    const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
    const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
    const endpoint = getApiEndpoint(finishedStack.Outputs);
    const apiKey = getApiKey(finishedStack.Outputs);

    expect(apiKey).toBeDefined();
    expect(endpoint).toBeDefined();

    GRAPHQL_CLIENT = new GraphQLClient(endpoint, { 'x-api-key': apiKey });
  } catch (e) {
    console.error(e);
    expect(true).toEqual(false);
  }
});

afterAll(async () => {
  destroyJsonServer();

  await cleanupStackAfterTest(BUCKET_NAME, STACK_NAME, cf);
});

/**
 * Test queries below
 */
test('HTTP GET request', async () => {
  try {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
            createComment(input: { title: "Hello, World!" }) {
                id
                title
                simpleGet {
                    id
                    title
                    body
                }
            }
        }`,
      {},
    );

    const post1Title = 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit';

    expect(response.errors).toBeUndefined();
    expect(response.data.createComment.id).toBeDefined();
    expect(response.data.createComment.title).toEqual('Hello, World!');
    expect(response.data.createComment.simpleGet).toBeDefined();
    expect(response.data.createComment.simpleGet.title).toEqual(post1Title);
  } catch (e) {
    console.error(e);
    // fail
    expect(e).toBeUndefined();
  }
});

test('HTTP GET request 2', async () => {
  try {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
            createComment(input: { title: "Hello, World!" }) {
                id
                title
                simpleGet2 {
                    id
                    title
                    body
                }
            }
        }`,
      {},
    );

    const post2Title = 'qui est esse';

    expect(response.errors).toBeUndefined();
    expect(response.data.createComment.id).toBeDefined();
    expect(response.data.createComment.title).toEqual('Hello, World!');
    expect(response.data.createComment.simpleGet2).toBeDefined();
    expect(response.data.createComment.simpleGet2.title).toEqual(post2Title);
  } catch (e) {
    console.error(e);
    // fail
    expect(e).toBeUndefined();
  }
});

test('HTTP POST request', async () => {
  try {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
            createComment(input: { title: "Hello, World!" }) {
                id
                title
                complexPost(
                    body: {
                        title: "foo",
                        body: "bar",
                        userId: 2
                    }
                ) {
                    id
                    title
                    body
                    userId
                }
            }
        }`,
      {},
    );

    expect(response.errors).toBeUndefined();
    expect(response.data.createComment.id).toBeDefined();
    expect(response.data.createComment.title).toEqual('Hello, World!');
    expect(response.data.createComment.complexPost).toBeDefined();
    expect(response.data.createComment.complexPost.title).toEqual('foo');
    expect(response.data.createComment.complexPost.userId).toEqual(2);
  } catch (e) {
    console.error(e);
    // fail
    expect(e).toBeUndefined();
  }
});

test('HTTP PUT request', async () => {
  try {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
            createComment(input: { title: "Hello, World!" }) {
                id
                title
                complexPut(
                    params: {
                        id: "3"
                    },
                    body: {
                        title: "foo",
                        body: "bar",
                        userId: 2
                    }
                ) {
                    id
                    title
                    body
                    userId
                }
            }
        }`,
      {},
    );

    expect(response.errors).toBeUndefined();
    expect(response.data.createComment.id).toBeDefined();
    expect(response.data.createComment.title).toEqual('Hello, World!');
    expect(response.data.createComment.complexPut).toBeDefined();
    expect(response.data.createComment.complexPut.title).toEqual('foo');
    expect(response.data.createComment.complexPut.userId).toEqual(2);
  } catch (e) {
    console.error(e);
    // fail
    expect(e).toBeUndefined();
  }
});

test('HTTP DELETE request', async () => {
  try {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
            createComment(input: { title: "Hello, World!" }) {
                id
                title
                deleter
            }
        }`,
      {},
    );

    expect(response.errors).toBeUndefined();
    expect(response.data.createComment.id).toBeDefined();
    expect(response.data.createComment.title).toEqual('Hello, World!');
    expect(response.data.createComment.deleter).not.toBeNull();
  } catch (e) {
    console.error(e);
    // fail
    expect(e).toBeUndefined();
  }
});

test('GET with URL param and query values', async () => {
  try {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
            createComment(input: { title: "Hello, World!" }) {
                id
                title
                complexGet(
                    params: {
                        data: "posts"
                    },
                    query: {
                        userId: 1,
                        _limit: 7
                    }
                ) {
                    id
                    title
                    body
                }
            }
        }`,
      {},
    );

    expect(response.errors).toBeUndefined();
    expect(response.data.createComment.id).toBeDefined();
    expect(response.data.createComment.title).toEqual('Hello, World!');
    expect(response.data.createComment.complexGet).toBeDefined();
    expect(response.data.createComment.complexGet.length).toEqual(7);
  } catch (e) {
    console.error(e);
    // fail
    expect(e).toBeUndefined();
  }
});

test('GET with multiple URL params and query values', async () => {
  try {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
            createComment(input: { title: "Hello, World!" }) {
                id
                title
                complexGet2(
                    params: {
                        dataType: "posts",
                        postId: "1",
                        secondType: "comments"
                    },
                    query: {
                        id: 2
                    }
                ) {
                    id
                    name
                    email
                }
            }
        }`,
      {},
    );

    expect(response.errors).toBeUndefined();
    expect(response.data.createComment.id).toBeDefined();
    expect(response.data.createComment.title).toEqual('Hello, World!');
    expect(response.data.createComment.complexGet2).toBeDefined();
    expect(response.data.createComment.complexGet2[0].email).toEqual('Jayne_Kuhic@sydney.com');
  } catch (e) {
    console.error(e);
    // fail
    expect(e).toBeUndefined();
  }
});

test('that GET errors when missing a required Query input object', async () => {
  try {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
            createComment(input: { title: "Hello, World!" }) {
                id
                title
                complexGet(
                    params: {
                        data: "posts",
                    }
                ) {
                    id
                    title
                    body
                }
            }
        }`,
      {},
    );

    expect(response.data).toBeNull();
    expect(response.errors).toBeDefined();
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].message).toEqual(
      "Validation error of type MissingFieldArgument: Missing field argument query @ 'createComment/complexGet'",
    );
  } catch (e) {
    console.error(e);
    // fail
    expect(e).toBeUndefined();
  }
});

test('that POST errors when missing a non-null arg in query/body', async () => {
  try {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
            createComment(input: { title: "Hello, World!" }) {
                id
                title
                complexPost(
                    body: {
                        id: 1,
                        body: "bar"
                    }
                ) {
                    id
                    title
                    body
                }
            }
        }`,
      {},
    );

    expect(response.data.createComment.complexPost).toBeNull();
    expect(response.errors).toBeDefined();
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].message).toEqual(
      'An argument you marked as Non-Null is not present in the query nor the body of your request.',
    );
  } catch (e) {
    console.error(e);
    // fail
    expect(e).toBeUndefined();
  }
});

test('headers, parent data, environment, and region support', async () => {
  const response = await GRAPHQL_CLIENT.query(
    `mutation {
      createComment(input: { title: "Hello, World!" }) {
        id
        title
        configGet {
          apiKey
          env
          region
          commentId
        }
      }
    }`,
    {},
  );

  expect(response.errors).toBeUndefined();
  expect(response.data.createComment.id).toBeDefined();
  expect(response.data.createComment.title).toEqual('Hello, World!');
  expect(response.data.createComment.configGet).toBeDefined();
  expect(response.data.createComment.configGet.apiKey).toEqual('fake-api-key');
  expect(response.data.createComment.configGet.env).toEqual('NONE');
  expect(response.data.createComment.configGet.region).toEqual(REGION);
  expect(response.data.createComment.configGet.commentId).toEqual(response.data.createComment.id);
});

describe('Non-Model types with Http resolvers', () => {
  test('HTTP GET request on a non-model field', async () => {
    try {
      const response = await GRAPHQL_CLIENT.query(
        `mutation {
              createTodo(input: { name: "Hello, World!", note: { id: "1" } }) {
                id
                name
                note {
                  id
                  simpleGet {
                      id
                      title
                      body
                  }
                }
              }
          }`,
        {},
      );

      const post1Title = 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit';

      expect(response.errors).toBeUndefined();
      expect(response.data.createTodo.id).toBeDefined();
      expect(response.data.createTodo.name).toEqual('Hello, World!');
      expect(response.data.createTodo.note.simpleGet).toBeDefined();
      expect(response.data.createTodo.note.id).toEqual('1');
      expect(response.data.createTodo.note.simpleGet.title).toEqual(post1Title);
    } catch (e) {
      console.error(e);
      // fail
      expect(e).toBeUndefined();
    }
  });

  test('HTTP POST request on a non-model field', async () => {
    try {
      const response = await GRAPHQL_CLIENT.query(
        `mutation {
          createTodo(input: { name: "Hello, World!", note: { id: "2" } }) {
            id
            name
            note {
              id
              complexPost(
                body: {
                    title: "foo",
                    body: "bar",
                    userId: 2
                }
              ) {
                id
                title
                body
                userId
              }
            }
          }
        }`,
        {},
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.createTodo.id).toBeDefined();
      expect(response.data.createTodo.name).toEqual('Hello, World!');
      expect(response.data.createTodo.note.complexPost).toBeDefined();
      expect(response.data.createTodo.note.complexPost.title).toEqual('foo');
      expect(response.data.createTodo.note.complexPost.userId).toEqual(2);
    } catch (e) {
      console.error(e);
      // fail
      expect(e).toBeUndefined();
    }
  });

  test('HTTP PUT request on a non-model field', async () => {
    try {
      const response = await GRAPHQL_CLIENT.query(
        `mutation {
          createTodo(input: { name: "Hello, World!", note: { id: "3" } }) {
                  id
                  name
                  note {
                    complexPut(
                      params: {
                          id: "3"
                      },
                      body: {
                          title: "foo",
                          body: "bar",
                          userId: 2
                      }
                    ) {
                      id
                      title
                      body
                      userId
                    }
                  }
          }
        }`,
        {},
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.createTodo.id).toBeDefined();
      expect(response.data.createTodo.name).toEqual('Hello, World!');
      expect(response.data.createTodo.note.complexPut).toBeDefined();
      expect(response.data.createTodo.note.complexPut.title).toEqual('foo');
      expect(response.data.createTodo.note.complexPut.userId).toEqual(2);
    } catch (e) {
      console.error(e);
      // fail
      expect(e).toBeUndefined();
    }
  });

  test('GET with URL param and query values on a non-model field', async () => {
    try {
      const response = await GRAPHQL_CLIENT.query(
        `mutation {
            createTodo(input: { name: "Hello, World!", note: { id: "4" } }) {
                  id
                  name
                  note {
                    complexGet(
                        params: {
                            data: "posts"
                        },
                        query: {
                            userId: 1,
                            _limit: 7
                        }
                    ) {
                        id
                        title
                        body
                    }
                  }
              }
          }`,
        {},
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.createTodo.id).toBeDefined();
      expect(response.data.createTodo.name).toEqual('Hello, World!');
      expect(response.data.createTodo.note.complexGet).toBeDefined();
      expect(response.data.createTodo.note.complexGet.length).toEqual(7);
    } catch (e) {
      console.error(e);
      // fail
      expect(e).toBeUndefined();
    }
  });

  test('GET with multiple URL params and query values on a non-model field', async () => {
    try {
      const response = await GRAPHQL_CLIENT.query(
        `mutation {
            createTodo(input: { name: "Hello, World!", note: { id: "5" } }) {
                  id
                  name
                  note {
                    complexGet2(
                      params: {
                          dataType: "posts",
                          postId: "1",
                          secondType: "comments"
                      },
                      query: {
                          id: 2
                      }
                    ) {
                        id
                        name
                        email
                    }
                  }
              }
          }`,
        {},
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.createTodo.id).toBeDefined();
      expect(response.data.createTodo.name).toEqual('Hello, World!');
      expect(response.data.createTodo.note.complexGet2).toBeDefined();
      expect(response.data.createTodo.note.complexGet2[0].email).toEqual('Jayne_Kuhic@sydney.com');
    } catch (e) {
      console.error(e);
      // fail
      expect(e).toBeUndefined();
    }
  });

  test('GET errors when missing a required Query input object on a non-model field', async () => {
    try {
      const response = await GRAPHQL_CLIENT.query(
        `mutation {
            createTodo(input: { name: "Hello, World!", note: { id: "6" } }) {
                  id
                  name
                  note {
                    complexGet(
                        params: {
                            data: "posts",
                        }
                    ) {
                        id
                        title
                        body
                    }
                  }
              }
          }`,
        {},
      );

      expect(response.data).toBeNull();
      expect(response.errors).toBeDefined();
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].message).toEqual(
        "Validation error of type MissingFieldArgument: Missing field argument query @ 'createTodo/note/complexGet'",
      );
    } catch (e) {
      console.error(e);
      // fail
      expect(e).toBeUndefined();
    }
  });

  test('POST errors when missing a non-null arg in query/body on a non-model field', async () => {
    try {
      const response = await GRAPHQL_CLIENT.query(
        `mutation {
            createTodo(input: { name: "Hello, World!", note: { id: "7" } }) {
                  id
                  name
                  note {
                    complexPost(
                        body: {
                            id: 1,
                            body: "bar"
                        }
                    ) {
                        id
                        title
                        body
                    }
                  }
              }
          }`,
        {},
      );

      expect(response.data.createTodo.note.complexPost).toBeNull();
      expect(response.errors).toBeDefined();
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].message).toEqual(
        'An argument you marked as Non-Null is not present in the query nor the body of your request.',
      );
    } catch (e) {
      console.error(e);
      // fail
      expect(e).toBeUndefined();
    }
  });

  test('headers, parent data, environment, and region support on a non-model field', async () => {
    const response = await GRAPHQL_CLIENT.query(
      `mutation {
        createTodo(input: { name: "Hello, World!", note: { id: "8" } }) {
          id
          name
          note {
            configGet {
              apiKey
              env
              region
              commentId
            }
          }
        }
      }`,
      {},
    );

    expect(response.errors).toBeUndefined();
    expect(response.data.createTodo.id).toBeDefined();
    expect(response.data.createTodo.name).toEqual('Hello, World!');
    expect(response.data.createTodo.note.configGet).toBeDefined();
    expect(response.data.createTodo.note.configGet.apiKey).toEqual('fake-api-key');
    expect(response.data.createTodo.note.configGet.env).toEqual('NONE');
    expect(response.data.createTodo.note.configGet.region).toEqual(REGION);
  });
});

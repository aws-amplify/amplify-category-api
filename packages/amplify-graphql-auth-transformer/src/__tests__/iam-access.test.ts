import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { BelongsToTransformer } from '@aws-amplify/graphql-relational-transformer/src';
import { constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AuthTransformer } from '../graphql-auth-transformer';

const IAM_ACCESS_CHECK_DDB =
  '#if( $util.authType() == "IAM Authorization" && $util.isNull($ctx.identity.cognitoIdentityPoolId) && $util.isNull($ctx.identity.cognitoIdentityId) )';
const IAM_ACCESS_CHECK_RDS =
  '#if( $util.authType() == "IAM Authorization" && $util.isNull($ctx.identity.cognitoIdentityPoolId) && $util.isNull($ctx.identity.cognitoIdentityId) )';
const IAM_ACCESS_CHECK_POST_AUTH =
  '#if( $util.authType() == "IAM Authorization" && $util.isNull($ctx.identity.cognitoIdentityPoolId) && $util.isNull($ctx.identity.cognitoIdentityId) )';
const API_KEY_ACCESS_CHECK_POST_AUTH = '#if( $util.authType() == "API Key Authorization" )';

describe('ddb', () => {
  test('simple model with apiKey and iam access', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: apiKey}]) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'API_KEY',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, ['@aws_iam', '@aws_api_key'], ['@aws_api_key', '@aws_iam']);
    expectResolversWithIamAccessCheck(out.resolvers, 'ddb');
  });

  test('simple model with apiKey and no iam access', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: apiKey}]) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'API_KEY',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: false,
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, [], []);
    expectResolversWithoutIamAccessCheck(out.resolvers);
  });

  test('simple model with iam provider and iam access', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: iam}]) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AWS_IAM',
        },
        additionalAuthenticationProviders: [],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, [], []);
    expectResolversWithIamAccessCheck(out.resolvers, 'ddb');
  });

  test('simple model with iam provider and no iam access', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: iam}]) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AWS_IAM',
        },
        additionalAuthenticationProviders: [],
      },
      synthParameters: {
        enableIamAccess: false,
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, [], []);
    expectResolversWithoutIamAccessCheck(out.resolvers);
  });

  test('simple model with iam provider and iam access and non default AWS_IAM mode', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: iam}]) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'API_KEY',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, ['@aws_iam'], ['@aws_iam']);
    expectResolversWithIamAccessCheck(out.resolvers, 'ddb');
  });

  test('simple model with no auth directive and non default AWS_IAM mode', () => {
    const validSchema = `
      type Post @model {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'API_KEY',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, ['@aws_iam'], ['@aws_iam']);
    expectNoAuthResolvers(out.resolvers);
  });

  test('simple model with no auth directive and both sandbox and iam access enabled', () => {
    const validSchema = `

      type Post @model {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      synthParameters: {
        enableIamAccess: true,
      },
      transformParameters: {
        sandboxModeEnabled: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, ['@aws_api_key', '@aws_iam'], ['@aws_api_key', '@aws_iam']);
    expectNoAuthResolvers(out.resolvers);
    expectSandboxResolvers(out.resolvers, true, true);
  });

  test('generates related type sandbox resolvers when both sandbox and iam access enabled', () => {
    const validSchema = `
      type PostCollection @model @auth(rules: [{allow: public, provider: iam}]) {
        id: ID!
        posts: [Post] @hasMany
      }
      type Post @model {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AWS_IAM',
        },
        additionalAuthenticationProviders: [],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformParameters: {
        sandboxModeEnabled: true,
      },
      transformers: [new ModelTransformer(), new HasManyTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expectSandboxResolvers(out.resolvers, true, true);
  });
});

describe('rds', () => {
  const mysqlStrategy = mockSqlDataSourceStrategy();
  test('simple model with apiKey and iam access', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: apiKey}]) {
        id: ID! @primaryKey
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'API_KEY',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, ['@aws_iam', '@aws_api_key'], ['@aws_api_key', '@aws_iam']);
    expectResolversWithIamAccessCheck(out.resolvers, 'rds');
  });

  test('simple model with apiKey and no iam access', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: apiKey}]) {
        id: ID! @primaryKey
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'API_KEY',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: false,
      },
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, [], []);
    expectResolversWithoutIamAccessCheck(out.resolvers);
  });

  test('simple model with iam provider and iam access', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: iam}]) {
        id: ID! @primaryKey
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AWS_IAM',
        },
        additionalAuthenticationProviders: [],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, [], []);
    expectResolversWithIamAccessCheck(out.resolvers, 'rds');
  });

  test('simple model with iam provider and no iam access', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: iam}]) {
        id: ID! @primaryKey
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AWS_IAM',
        },
        additionalAuthenticationProviders: [],
      },
      synthParameters: {
        enableIamAccess: false,
      },
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, [], []);
    expectResolversWithoutIamAccessCheck(out.resolvers);
  });

  test('simple model with iam provider and iam access and non default AWS_IAM mode', () => {
    const validSchema = `
      type Post @model @auth(rules: [{allow: public, provider: iam}]) {
        id: ID! @primaryKey
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'API_KEY',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, ['@aws_iam'], ['@aws_iam']);
    expectResolversWithIamAccessCheck(out.resolvers, 'rds');
  });

  test('simple model with no auth directive and non default AWS_IAM mode', () => {
    const validSchema = `
      type Post @model {
        id: ID! @primaryKey
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'API_KEY',
        },
        additionalAuthenticationProviders: [
          {
            authenticationType: 'AWS_IAM',
          },
        ],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, ['@aws_iam'], ['@aws_iam']);
    expectNoAuthResolvers(out.resolvers);
  });

  test('simple model with no auth directive and sandbox and iam access enabled', () => {
    const validSchema = `
      type Post @model {
        id: ID! @primaryKey
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      synthParameters: {
        enableIamAccess: true,
      },
      transformParameters: {
        sandboxModeEnabled: true,
      },
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    expectOperationsWithDirectives(out.schema, ['@aws_api_key', '@aws_iam'], ['@aws_api_key', '@aws_iam']);
    expectNoAuthResolvers(out.resolvers);
    expectSandboxResolvers(out.resolvers, true, true);
  });

  test('generates related type sandbox resolvers when both sandbox and iam access enabled', () => {
    const validSchema = `
      type Blog @model @auth(rules: [{allow: public, provider: iam}]) {
        id: ID! @primaryKey
        posts: [Post] @hasMany(references: "blogId")
      }
      type Post @model {
        id: ID! @primaryKey
        blogId: ID!
        blog: Blog @belongsTo(references: "blogId")
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AWS_IAM',
        },
        additionalAuthenticationProviders: [],
      },
      synthParameters: {
        enableIamAccess: true,
      },
      transformParameters: {
        sandboxModeEnabled: true,
      },
      transformers: [
        new ModelTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
        new AuthTransformer(),
        new PrimaryKeyTransformer(),
      ],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });
    expect(out).toBeDefined();
    expectSandboxResolvers(out.resolvers, true, true);
  });
});

const expectOperationsWithDirectives = (schema: string, expectedModelDirectives: string[], expectedOperationDirectives: string[]): void => {
  let modelDirectives = '';
  if (expectedModelDirectives && expectedModelDirectives.length > 0) {
    modelDirectives = ` ${expectedModelDirectives.join(' ')}`;
  }
  let operationDirectives = '';
  if (expectedOperationDirectives && expectedOperationDirectives.length > 0) {
    operationDirectives = ` ${expectedOperationDirectives.join(' ')}`;
  }
  expect(schema).toContain(`type Post${modelDirectives} {`);
  expect(schema).toContain(`createPost(input: CreatePostInput!, condition: ModelPostConditionInput): Post${operationDirectives}\n`);
  expect(schema).toContain(`updatePost(input: UpdatePostInput!, condition: ModelPostConditionInput): Post${operationDirectives}\n`);
  expect(schema).toContain(`deletePost(input: DeletePostInput!, condition: ModelPostConditionInput): Post${operationDirectives}\n`);
  expect(schema).toContain(`getPost(id: ID!): Post${operationDirectives}`);
  expect(schema).toContain(
    `onCreatePost(filter: ModelSubscriptionPostFilterInput): Post @aws_subscribe(mutations: ["createPost"])${operationDirectives}\n`,
  );
  expect(schema).toContain(
    `onUpdatePost(filter: ModelSubscriptionPostFilterInput): Post @aws_subscribe(mutations: ["updatePost"])${operationDirectives}\n`,
  );
  expect(schema).toContain(
    `onDeletePost(filter: ModelSubscriptionPostFilterInput): Post @aws_subscribe(mutations: ["deletePost"])${operationDirectives}\n`,
  );
};

const expectResolversWithIamAccessCheck = (resolvers: Record<string, string>, dataSource: 'ddb' | 'rds'): void => {
  let expectedIamCheck: string;
  switch (dataSource) {
    case 'ddb':
      expectedIamCheck = IAM_ACCESS_CHECK_DDB;
      break;
    case 'rds':
      expectedIamCheck = IAM_ACCESS_CHECK_RDS;
      break;
  }
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toBeDefined();
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toBeDefined();
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.getPost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.getPost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Query.getPost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toMatchSnapshot();
};

const expectResolversWithoutIamAccessCheck = (resolvers: Record<string, string>): void => {
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toBeDefined();
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toBeDefined();
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.getPost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Query.getPost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.getPost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.getPost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Query.getPost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toMatchSnapshot();
};

const expectNoAuthResolvers = (resolvers: Record<string, string>): void => {
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).toBeUndefined();
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toBeUndefined();
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toBeUndefined();
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toBeUndefined();
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toBeUndefined();
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toBeUndefined();
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toBeUndefined();
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toBeUndefined();
};

const expectSandboxResolvers = (resolvers: Record<string, string>, expectIamAccessCheck: boolean, expectApiKeyCheck: boolean): void => {
  expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).toBeDefined();
  if (expectIamAccessCheck) {
    expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  }
  if (expectApiKeyCheck) {
    expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).not.toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  }
  expect(resolvers['Mutation.createPost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toBeDefined();
  if (expectIamAccessCheck) {
    expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  }
  if (expectApiKeyCheck) {
    expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).not.toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  }
  expect(resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toBeDefined();
  if (expectIamAccessCheck) {
    expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  }
  if (expectApiKeyCheck) {
    expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).not.toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  }
  expect(resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.getPost.postAuth.1.req.vtl']).toBeDefined();
  if (expectIamAccessCheck) {
    expect(resolvers['Query.getPost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Query.getPost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  }
  if (expectApiKeyCheck) {
    expect(resolvers['Query.getPost.postAuth.1.req.vtl']).toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Query.getPost.postAuth.1.req.vtl']).not.toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  }
  expect(resolvers['Query.getPost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).toBeDefined();
  if (expectIamAccessCheck) {
    expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  }
  if (expectApiKeyCheck) {
    expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).not.toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  }
  expect(resolvers['Query.listPosts.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toBeDefined();
  if (expectIamAccessCheck) {
    expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  }
  if (expectApiKeyCheck) {
    expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).not.toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  }
  expect(resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toBeDefined();
  if (expectIamAccessCheck) {
    expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  }
  if (expectApiKeyCheck) {
    expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).not.toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  }
  expect(resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toBeDefined();
  if (expectIamAccessCheck) {
    expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toContain(IAM_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_POST_AUTH);
  }
  if (expectApiKeyCheck) {
    expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  } else {
    expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).not.toContain(API_KEY_ACCESS_CHECK_POST_AUTH);
  }
  expect(resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toMatchSnapshot();
};

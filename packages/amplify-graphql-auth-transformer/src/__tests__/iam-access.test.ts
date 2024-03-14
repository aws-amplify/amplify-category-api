import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AuthTransformer } from '../graphql-auth-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';

const IAM_ACCESS_CHECK_DDB = '#if( $util.isNull($ctx.identity.cognitoIdentityPoolId) && $util.isNull($ctx.identity.cognitoIdentityId) )';
const IAM_ACCESS_CHECK_RDS =
  '#if( $util.authType() == "IAM Authorization" && $util.isNull($ctx.identity.cognitoIdentityPoolId) && $util.isNull($ctx.identity.cognitoIdentityId) )';

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
    expectOperationsWithDirectives(out.schema, '@aws_api_key', '@aws_iam');
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
    expectOperationsWithDirectives(out.schema);
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
    expectOperationsWithDirectives(out.schema);
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
    expectOperationsWithDirectives(out.schema);
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
    expectOperationsWithDirectives(out.schema, '@aws_iam');
    expectResolversWithIamAccessCheck(out.resolvers, 'ddb');
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
    expectOperationsWithDirectives(out.schema, '@aws_api_key', '@aws_iam');
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
    expectOperationsWithDirectives(out.schema);
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
    expectOperationsWithDirectives(out.schema);
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
    expectOperationsWithDirectives(out.schema);
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
    expectOperationsWithDirectives(out.schema, '@aws_iam');
    expectResolversWithIamAccessCheck(out.resolvers, 'rds');
  });
});

const expectOperationsWithDirectives = (schema: string, ...expectedDirectives: string[]): void => {
  let directives = '';
  if (expectedDirectives && expectedDirectives.length > 0) {
    directives = ` ${expectedDirectives.join(' ')}\n`;
  } else {
    // This asserts that directives are blank.
    directives = '\n';
  }
  expect(schema).toContain(`Post${directives}`);
  expect(schema).toContain(`createPost(input: CreatePostInput!, condition: ModelPostConditionInput): Post${directives}`);
  expect(schema).toContain(`updatePost(input: UpdatePostInput!, condition: ModelPostConditionInput): Post${directives}`);
  expect(schema).toContain(`deletePost(input: DeletePostInput!, condition: ModelPostConditionInput): Post${directives}`);
  expect(schema).toContain(`getPost(id: ID!): Post${directives}`);
  expect(schema).toContain(
    `onCreatePost(filter: ModelSubscriptionPostFilterInput): Post @aws_subscribe(mutations: ["createPost"])${directives}`,
  );
  expect(schema).toContain(
    `onUpdatePost(filter: ModelSubscriptionPostFilterInput): Post @aws_subscribe(mutations: ["updatePost"])${directives}`,
  );
  expect(schema).toContain(
    `onDeletePost(filter: ModelSubscriptionPostFilterInput): Post @aws_subscribe(mutations: ["deletePost"])${directives}`,
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
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toBeDefined();
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toBeDefined();
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toContain(expectedIamCheck);
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toMatchSnapshot();
};

const expectResolversWithoutIamAccessCheck = (resolvers: Record<string, string>): void => {
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toBeDefined();
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Mutation.updatePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toBeDefined();
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Mutation.deletePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.getPost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Query.getPost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toMatchSnapshot();
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toBeDefined();
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_DDB);
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).not.toContain(IAM_ACCESS_CHECK_RDS);
  expect(resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toMatchSnapshot();
};

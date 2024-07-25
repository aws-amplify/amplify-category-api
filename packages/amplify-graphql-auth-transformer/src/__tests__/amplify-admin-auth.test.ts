import _ from 'lodash';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AuthTransformer } from '../graphql-auth-transformer';
import { expectStashValueLike, expectNoStashValueLike } from './test-helpers';

const ADMIN_UI_ROLES = ['us-fake-1_uuid_Full-access/CognitoIdentityCredentials', 'us-fake-1_uuid_Manage-only/CognitoIdentityCredentials'];
const ADMIN_UI_ADMIN_ROLES =
  '$util.qr($ctx.stash.put(\\"adminRoles\\", [\\"us-fake-1_uuid_Full-access/CognitoIdentityCredentials\\",\\"us-fake-1_uuid_Manage-only/CognitoIdentityCredentials\\"])';
const EMPTY_ADMIN_ROLES = '$util.qr($ctx.stash.put(\\"adminRoles\\", [])';
const IDENTITY_POOL_ASSIGNMENT_PREFIX = '$util.qr($ctx.stash.put(\\"identityPoolId\\"';

test('simple model with public auth rule and amplify admin app is present', () => {
  const validSchema = `
  type Post @model @auth(rules: [{allow: public}]) {
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
      adminRoles: ADMIN_UI_ROLES,
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toContain('Post @aws_api_key @aws_iam');
  expectStashValueLike(out, 'Post', ADMIN_UI_ADMIN_ROLES);
  expectNoStashValueLike(out, 'Post', IDENTITY_POOL_ASSIGNMENT_PREFIX);
});

test('simple model with public auth rule and amplify admin app is not enabled', () => {
  const validSchema = `
      type Post @model @auth(rules: [{allow: public}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'API_KEY',
      },
      additionalAuthenticationProviders: [],
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).not.toContain('Post @aws_api_key @aws_iam');
  expectStashValueLike(out, 'Post', EMPTY_ADMIN_ROLES);
  expectNoStashValueLike(out, 'Post', IDENTITY_POOL_ASSIGNMENT_PREFIX);
});

test('model with public auth rule without all operations and amplify admin app is present', () => {
  const validSchema = `
      type Post @model @auth(rules: [{allow: public, operations: [read, update]}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
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
      adminRoles: ADMIN_UI_ROLES,
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();

  expect(out.schema).toContain('type Post @aws_iam @aws_api_key');
  expect(out.schema).toContain('createPost(input: CreatePostInput!, condition: ModelPostConditionInput): Post @aws_api_key @aws_iam');
  expect(out.schema).toContain('updatePost(input: UpdatePostInput!, condition: ModelPostConditionInput): Post @aws_api_key @aws_iam');
  expect(out.schema).toContain('deletePost(input: DeletePostInput!, condition: ModelPostConditionInput): Post @aws_api_key @aws_iam');
  expectStashValueLike(out, 'Post', ADMIN_UI_ADMIN_ROLES);
  expectNoStashValueLike(out, 'Post', IDENTITY_POOL_ASSIGNMENT_PREFIX);

  // No Resource extending Auth and UnAuth role
  const policyResources = Object.values(out.rootStack.Resources!).filter((r) => r.Type === 'AWS::IAM::ManagedPolicy');
  expect(policyResources).toHaveLength(0);
});

test('simple model with private auth rule and amplify admin app is present', () => {
  const validSchema = `
      type Post @model @auth(rules: [{allow: groups, groups: ["Admin", "Dev"]}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    synthParameters: {
      adminRoles: ADMIN_UI_ROLES,
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toContain('type Post @aws_iam @aws_cognito_user_pools');
  expectStashValueLike(out, 'Post', ADMIN_UI_ADMIN_ROLES);
  expectNoStashValueLike(out, 'Post', IDENTITY_POOL_ASSIGNMENT_PREFIX);
});

test('simple model with private auth rule and amplify admin app not enabled', () => {
  const validSchema = `
      type Post @model @auth(rules: [{allow: groups, groups: ["Admin", "Dev"]}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).not.toContain('type Post @aws_iam @aws_cognito_user_pools');
  expectStashValueLike(out, 'Post', EMPTY_ADMIN_ROLES);
  expectNoStashValueLike(out, 'Post', IDENTITY_POOL_ASSIGNMENT_PREFIX);
});

test('simple model with private auth rule, few operations, and amplify admin app enabled', () => {
  const validSchema = `
      type Post @model @auth(rules: [{allow: groups, groups: ["Admin", "Dev"], operations: [read]}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    synthParameters: {
      adminRoles: ADMIN_UI_ROLES,
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toContain('type Post @aws_iam @aws_cognito_user_pools');
  expect(out.schema).toContain(
    'createPost(input: CreatePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expect(out.schema).toContain(
    'updatePost(input: UpdatePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expect(out.schema).toContain(
    'deletePost(input: DeletePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expectStashValueLike(out, 'Post', ADMIN_UI_ADMIN_ROLES);
  expectNoStashValueLike(out, 'Post', IDENTITY_POOL_ASSIGNMENT_PREFIX);

  // No Resource extending Auth and UnAuth role
  const policyResources = Object.values(out.rootStack.Resources!).filter((r) => r.Type === 'AWS::IAM::ManagedPolicy');
  expect(policyResources).toHaveLength(0);
});

test('simple model with private IAM auth rule, few operations, and amplify admin app is not enabled', () => {
  const validSchema = `
      type Post @model @auth(rules: [{allow: private, provider: iam, operations: [read, update]}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const identityPoolId = 'testIdentityPoolId';
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    synthParameters: {
      identityPoolId,
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toContain('Post @aws_iam');
  expect(out.schema).not.toContain(
    'createPost(input: CreatePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expect(out.schema).not.toContain('deletePost(input: DeletePostInput!): Post @aws_iam');
  expect(out.schema).not.toContain('updatePost(input: UpdatePostInput!): Post @aws_iam');

  expect(out.schema).toContain('getPost(id: ID!): Post @aws_iam');
  expect(out.schema).toContain('listPosts(filter: ModelPostFilterInput, limit: Int, nextToken: String): ModelPostConnection @aws_iam');

  expect(out.resolvers['Mutation.updatePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updatePost.auth.1.res.vtl']).toContain(
    '#if( ($ctx.identity.userArn == $ctx.stash.authRole) || ($ctx.identity.cognitoIdentityPoolId == $ctx.stash.identityPoolId && $ctx.identity.cognitoIdentityAuthType == "authenticated") )',
  );
  expectStashValueLike(out, 'Post', EMPTY_ADMIN_ROLES);
  expectStashValueLike(out, 'Post', '$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"testIdentityPoolId\\"))');
});

test('simple model with private IdentityPool auth rule, few operations, and amplify admin app is not enabled', () => {
  const validSchema = `
      type Post @model @auth(rules: [{allow: private, provider: identityPool, operations: [read, update]}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const identityPoolId = 'testIdentityPoolId';
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    synthParameters: {
      identityPoolId,
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toContain('Post @aws_iam');
  expect(out.schema).not.toContain(
    'createPost(input: CreatePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expect(out.schema).not.toContain('deletePost(input: DeletePostInput!): Post @aws_iam');
  expect(out.schema).not.toContain('updatePost(input: UpdatePostInput!): Post @aws_iam');

  expect(out.schema).toContain('getPost(id: ID!): Post @aws_iam');
  expect(out.schema).toContain('listPosts(filter: ModelPostFilterInput, limit: Int, nextToken: String): ModelPostConnection @aws_iam');

  expect(out.resolvers['Mutation.updatePost.auth.1.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updatePost.auth.1.res.vtl']).toContain(
    '#if( ($ctx.identity.userArn == $ctx.stash.authRole) || ($ctx.identity.cognitoIdentityPoolId == $ctx.stash.identityPoolId && $ctx.identity.cognitoIdentityAuthType == "authenticated") )',
  );
  expectStashValueLike(out, 'Post', EMPTY_ADMIN_ROLES);
  expectStashValueLike(out, 'Post', '$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"testIdentityPoolId\\"))');
});

test('simple model with AdminUI enabled should add IAM policy only for fields that have explicit IAM auth', () => {
  const validSchema = `
      type Post @model @auth(rules: [{allow: private, provider: iam, operations: [read]}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    synthParameters: {
      adminRoles: ADMIN_UI_ROLES,
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toContain('Post @aws_iam @aws_cognito_user_pool');
  expect(out.schema).toContain(
    'createPost(input: CreatePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expect(out.schema).toContain(
    'updatePost(input: UpdatePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expect(out.schema).toContain(
    'deletePost(input: DeletePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expectStashValueLike(out, 'Post', ADMIN_UI_ADMIN_ROLES);
  expectNoStashValueLike(out, 'Post', IDENTITY_POOL_ASSIGNMENT_PREFIX);

  expect(out.schema).toContain('getPost(id: ID!): Post @aws_iam');
  expect(out.schema).toContain('listPosts(filter: ModelPostFilterInput, limit: Int, nextToken: String): ModelPostConnection @aws_iam');
  const policyResources = _.filter(out.rootStack.Resources, (r) => r.Type === 'AWS::IAM::ManagedPolicy');
  expect(policyResources).toHaveLength(1);
  const resources = _.get(policyResources, '[0].Properties.PolicyDocument.Statement[0].Resource');
  const typeFieldList = _.map(resources, (r) => _.get(r, 'Fn::Sub[1]')).map((r) => `${_.get(r, 'typeName')}.${_.get(r, 'fieldName', '*')}`);
  expect(typeFieldList).toEqual([
    'Post.*',
    'Query.getPost',
    'Query.listPosts',
    'Mutation.createPost',
    'Mutation.updatePost',
    'Mutation.deletePost',
    'Subscription.onCreatePost',
    'Subscription.onUpdatePost',
    'Subscription.onDeletePost',
  ]);
  // should throw unauthorized if it's not signed by the admin ui iam role
  ['Mutation.createPost.auth.1.req.vtl', 'Mutation.updatePost.auth.1.res.vtl', 'Mutation.deletePost.auth.1.res.vtl'].forEach((r) => {
    expect(out.resolvers[r]).toMatchSnapshot();
  });
});

test('simple model with AdminUI enabled should add IAM policy only for fields that have explicit IdentityPool auth', () => {
  const validSchema = `
      type Post @model @auth(rules: [{allow: private, provider: identityPool, operations: [read]}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
      }
      `;
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    synthParameters: {
      adminRoles: ADMIN_UI_ROLES,
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.schema).toContain('Post @aws_iam @aws_cognito_user_pool');
  expect(out.schema).toContain(
    'createPost(input: CreatePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expect(out.schema).toContain(
    'updatePost(input: UpdatePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expect(out.schema).toContain(
    'deletePost(input: DeletePostInput!, condition: ModelPostConditionInput): Post @aws_iam @aws_cognito_user_pools',
  );
  expectStashValueLike(out, 'Post', ADMIN_UI_ADMIN_ROLES);
  expectNoStashValueLike(out, 'Post', IDENTITY_POOL_ASSIGNMENT_PREFIX);

  expect(out.schema).toContain('getPost(id: ID!): Post @aws_iam');
  expect(out.schema).toContain('listPosts(filter: ModelPostFilterInput, limit: Int, nextToken: String): ModelPostConnection @aws_iam');
  const policyResources = _.filter(out.rootStack.Resources, (r) => r.Type === 'AWS::IAM::ManagedPolicy');
  expect(policyResources).toHaveLength(1);
  const resources = _.get(policyResources, '[0].Properties.PolicyDocument.Statement[0].Resource');
  const typeFieldList = _.map(resources, (r) => _.get(r, 'Fn::Sub[1]')).map((r) => `${_.get(r, 'typeName')}.${_.get(r, 'fieldName', '*')}`);
  expect(typeFieldList).toEqual([
    'Post.*',
    'Query.getPost',
    'Query.listPosts',
    'Mutation.createPost',
    'Mutation.updatePost',
    'Mutation.deletePost',
    'Subscription.onCreatePost',
    'Subscription.onUpdatePost',
    'Subscription.onDeletePost',
  ]);
  // should throw unauthorized if it's not signed by the admin ui iam role
  ['Mutation.createPost.auth.1.req.vtl', 'Mutation.updatePost.auth.1.res.vtl', 'Mutation.deletePost.auth.1.res.vtl'].forEach((r) => {
    expect(out.resolvers[r]).toMatchSnapshot();
  });
});

test('admin roles should be return the field name inside field resolvers', () => {
  const validSchema = `
    type Student @model @auth(rules: [{ allow: groups, groups: ["staff"] }, { allow: owner }]) {
      id: ID!
      name: String
      description: String
      secretValue: String @auth(rules: [{ allow: owner }])
    }`;
  const out = testTransform({
    schema: validSchema,
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'AWS_IAM',
        },
      ],
    },
    synthParameters: {
      adminRoles: ADMIN_UI_ROLES,
    },
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });
  expect(out).toBeDefined();

  expect(out.resolvers['Student.secretValue.req.vtl']).toMatchSnapshot();
  expectStashValueLike(out, 'Student', ADMIN_UI_ADMIN_ROLES);
  expectNoStashValueLike(out, 'Student', IDENTITY_POOL_ASSIGNMENT_PREFIX);
  expect(out.resolvers['Mutation.createStudent.auth.1.req.vtl']).toMatchSnapshot();
});

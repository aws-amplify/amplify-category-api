import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { constructDataSourceStrategies, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { AuthTransformer } from '../graphql-auth-transformer';
import { expectStashValueLike } from './test-helpers';

describe('Verify RDS Model level Auth rules on mutations:', () => {
  const ADMIN_UI_ROLES = ['us-fake-1_uuid_Full-access/CognitoIdentityCredentials', 'us-fake-1_uuid_Manage-only/CognitoIdentityCredentials'];
  const ADMIN_UI_ADMIN_ROLES =
    '$util.qr($ctx.stash.put(\\"adminRoles\\", [\\"us-fake-1_uuid_Full-access/CognitoIdentityCredentials\\",\\"us-fake-1_uuid_Manage-only/CognitoIdentityCredentials\\"])';

  const mysqlStrategy = mockSqlDataSourceStrategy();

  it('should successfully transform apiKey auth rule', async () => {
    const validSchema = `
      type Post @model
        @auth(rules: [{allow: public}]) {
          id: ID! @primaryKey
          title: String!
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      synthParameters: {
        identityPoolId: 'TEST_IDENTITY_POOL_ID',
      },
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    // Verify Create mutation authorization rule
    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.createPost.postAuth.1.req.vtl']).toMatchSnapshot();

    // Verify Update mutation authorization rule
    expect(out.resolvers['Mutation.updatePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.updatePost.auth.1.res.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toMatchSnapshot();

    // Verify Delete mutation authorization rule
    expect(out.resolvers['Mutation.deletePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.deletePost.auth.1.res.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toMatchSnapshot();
  });

  it('should successfully transform cognito auth rules', async () => {
    const validSchema = `
      type PostPrivate @model
        @auth(rules: [
          {allow: private}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type PostSingleOwner @model
        @auth(rules: [
          {allow: owner}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type PostOwners @model
        @auth(rules: [
          {allow: owner, ownerField: "owners"}
        ]) {
          id: ID! @primaryKey
          title: String!
          owners: [String]
      }

      type PostStaticGroups @model
        @auth(rules: [
          {allow: groups, groups: ["Admin", "Moderator"]}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type PostGroups @model
        @auth(rules: [
          {allow: groups, groupsField: "groups"}
        ]) {
          id: ID! @primaryKey
          title: String!
          groups: [String]
      }

      type PostSingleGroup @model
        @auth(rules: [
          {allow: groups, groupsField: "group"}
        ]) {
          id: ID! @primaryKey
          title: String!
          group: String
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        userPoolConfig: {
          userPoolId: 'TEST_USER_POOL_ID',
        },
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      authConfig,
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      synthParameters: {
        identityPoolId: 'TEST_IDENTITY_POOL_ID',
      },
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    const authResolvers = [
      // Private
      'Mutation.createPostPrivate.auth.1.req.vtl',
      'Mutation.createPostPrivate.postAuth.1.req.vtl',
      'Mutation.updatePostPrivate.auth.1.req.vtl',
      'Mutation.updatePostPrivate.auth.1.res.vtl',
      'Mutation.updatePostPrivate.postAuth.1.req.vtl',
      'Mutation.deletePostPrivate.auth.1.req.vtl',
      'Mutation.deletePostPrivate.auth.1.res.vtl',
      'Mutation.deletePostPrivate.postAuth.1.req.vtl',
      // Owner
      'Mutation.createPostSingleOwner.auth.1.req.vtl',
      'Mutation.createPostSingleOwner.postAuth.1.req.vtl',
      'Mutation.updatePostSingleOwner.auth.1.req.vtl',
      'Mutation.updatePostSingleOwner.auth.1.res.vtl',
      'Mutation.updatePostSingleOwner.postAuth.1.req.vtl',
      'Mutation.deletePostSingleOwner.auth.1.req.vtl',
      'Mutation.deletePostSingleOwner.auth.1.res.vtl',
      'Mutation.deletePostSingleOwner.postAuth.1.req.vtl',
      // Owners
      'Mutation.createPostOwners.auth.1.req.vtl',
      'Mutation.createPostOwners.postAuth.1.req.vtl',
      'Mutation.updatePostOwners.auth.1.req.vtl',
      'Mutation.updatePostOwners.auth.1.res.vtl',
      'Mutation.updatePostOwners.postAuth.1.req.vtl',
      'Mutation.deletePostOwners.auth.1.req.vtl',
      'Mutation.deletePostOwners.auth.1.res.vtl',
      'Mutation.deletePostOwners.postAuth.1.req.vtl',
      // Static Groups
      'Mutation.createPostStaticGroups.auth.1.req.vtl',
      'Mutation.createPostStaticGroups.postAuth.1.req.vtl',
      'Mutation.updatePostStaticGroups.auth.1.req.vtl',
      'Mutation.updatePostStaticGroups.auth.1.res.vtl',
      'Mutation.updatePostStaticGroups.postAuth.1.req.vtl',
      'Mutation.deletePostStaticGroups.auth.1.req.vtl',
      'Mutation.deletePostStaticGroups.auth.1.res.vtl',
      'Mutation.deletePostStaticGroups.postAuth.1.req.vtl',
      // Group
      'Mutation.createPostSingleGroup.auth.1.req.vtl',
      'Mutation.createPostSingleGroup.postAuth.1.req.vtl',
      'Mutation.updatePostSingleGroup.auth.1.req.vtl',
      'Mutation.updatePostSingleGroup.auth.1.res.vtl',
      'Mutation.updatePostSingleGroup.postAuth.1.req.vtl',
      'Mutation.deletePostSingleGroup.auth.1.req.vtl',
      'Mutation.deletePostSingleGroup.auth.1.res.vtl',
      'Mutation.deletePostSingleGroup.postAuth.1.req.vtl',
      // Groups
      'Mutation.createPostGroups.auth.1.req.vtl',
      'Mutation.createPostGroups.postAuth.1.req.vtl',
      'Mutation.updatePostGroups.auth.1.req.vtl',
      'Mutation.updatePostGroups.auth.1.res.vtl',
      'Mutation.updatePostGroups.postAuth.1.req.vtl',
      'Mutation.deletePostGroups.auth.1.req.vtl',
      'Mutation.deletePostGroups.auth.1.res.vtl',
      'Mutation.deletePostGroups.postAuth.1.req.vtl',
    ];

    authResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toBeDefined();
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

  it('should successfully transform oidc auth rules', async () => {
    const validSchema = `
      type PostPrivate @model
        @auth(rules: [
          {allow: private, provider: oidc}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type PostSingleOwner @model
        @auth(rules: [
          {allow: owner, provider: oidc}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type PostOwners @model
        @auth(rules: [
          {allow: owner, ownerField: "owners", provider: oidc}
        ]) {
          id: ID! @primaryKey
          title: String!
          owners: [String]
      }

      type PostStaticGroups @model
        @auth(rules: [
          {allow: groups, groups: ["Admin", "Moderator"], provider: oidc}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type PostGroups @model
        @auth(rules: [
          {allow: groups, groupsField: "groups", provider: oidc}
        ]) {
          id: ID! @primaryKey
          title: String!
          groups: [String]
      }

      type PostSingleGroup @model
        @auth(rules: [
          {allow: groups, groupsField: "group", provider: oidc}
        ]) {
          id: ID! @primaryKey
          title: String!
          group: String
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'OPENID_CONNECT',
        openIDConnectConfig: {
          name: 'myOIDCProvider',
          issuerUrl: 'https://some-oidc-provider/auth',
          clientId: 'my-sample-client-id',
        },
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      authConfig,
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      synthParameters: {
        identityPoolId: 'TEST_IDENTITY_POOL_ID',
      },
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    const authResolvers = [
      // Private
      'Mutation.createPostPrivate.auth.1.req.vtl',
      'Mutation.createPostPrivate.postAuth.1.req.vtl',
      'Mutation.updatePostPrivate.auth.1.req.vtl',
      'Mutation.updatePostPrivate.auth.1.res.vtl',
      'Mutation.updatePostPrivate.postAuth.1.req.vtl',
      'Mutation.deletePostPrivate.auth.1.req.vtl',
      'Mutation.deletePostPrivate.auth.1.res.vtl',
      'Mutation.deletePostPrivate.postAuth.1.req.vtl',
      // Owner
      'Mutation.createPostSingleOwner.auth.1.req.vtl',
      'Mutation.createPostSingleOwner.postAuth.1.req.vtl',
      'Mutation.updatePostSingleOwner.auth.1.req.vtl',
      'Mutation.updatePostSingleOwner.auth.1.res.vtl',
      'Mutation.updatePostSingleOwner.postAuth.1.req.vtl',
      'Mutation.deletePostSingleOwner.auth.1.req.vtl',
      'Mutation.deletePostSingleOwner.auth.1.res.vtl',
      'Mutation.deletePostSingleOwner.postAuth.1.req.vtl',
      // Owners
      'Mutation.createPostOwners.auth.1.req.vtl',
      'Mutation.createPostOwners.postAuth.1.req.vtl',
      'Mutation.updatePostOwners.auth.1.req.vtl',
      'Mutation.updatePostOwners.auth.1.res.vtl',
      'Mutation.updatePostOwners.postAuth.1.req.vtl',
      'Mutation.deletePostOwners.auth.1.req.vtl',
      'Mutation.deletePostOwners.auth.1.res.vtl',
      'Mutation.deletePostOwners.postAuth.1.req.vtl',
      // Static Groups
      'Mutation.createPostStaticGroups.auth.1.req.vtl',
      'Mutation.createPostStaticGroups.postAuth.1.req.vtl',
      'Mutation.updatePostStaticGroups.auth.1.req.vtl',
      'Mutation.updatePostStaticGroups.auth.1.res.vtl',
      'Mutation.updatePostStaticGroups.postAuth.1.req.vtl',
      'Mutation.deletePostStaticGroups.auth.1.req.vtl',
      'Mutation.deletePostStaticGroups.auth.1.res.vtl',
      'Mutation.deletePostStaticGroups.postAuth.1.req.vtl',
      // Group
      'Mutation.createPostSingleGroup.auth.1.req.vtl',
      'Mutation.createPostSingleGroup.postAuth.1.req.vtl',
      'Mutation.updatePostSingleGroup.auth.1.req.vtl',
      'Mutation.updatePostSingleGroup.auth.1.res.vtl',
      'Mutation.updatePostSingleGroup.postAuth.1.req.vtl',
      'Mutation.deletePostSingleGroup.auth.1.req.vtl',
      'Mutation.deletePostSingleGroup.auth.1.res.vtl',
      'Mutation.deletePostSingleGroup.postAuth.1.req.vtl',
      // Groups
      'Mutation.createPostGroups.auth.1.req.vtl',
      'Mutation.createPostGroups.postAuth.1.req.vtl',
      'Mutation.updatePostGroups.auth.1.req.vtl',
      'Mutation.updatePostGroups.auth.1.res.vtl',
      'Mutation.updatePostGroups.postAuth.1.req.vtl',
      'Mutation.deletePostGroups.auth.1.req.vtl',
      'Mutation.deletePostGroups.auth.1.res.vtl',
      'Mutation.deletePostGroups.postAuth.1.req.vtl',
    ];

    authResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toBeDefined();
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

  it('should successfully transform function auth rule', async () => {
    const validSchema = `
      type Post @model
        @auth(rules: [{allow: custom}]) {
          id: ID! @primaryKey
          title: String!
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_LAMBDA',
        lambdaAuthorizerConfig: {
          lambdaFunction: 'TEST_LAMBDA_AUTH_FUNCTION',
        },
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      authConfig,
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      synthParameters: {
        identityPoolId: 'TEST_IDENTITY_POOL_ID',
      },
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    // Verify Create mutation authorization rule
    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.createPost.postAuth.1.req.vtl']).toMatchSnapshot();

    // Verify Update mutation authorization rule
    expect(out.resolvers['Mutation.updatePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.updatePost.auth.1.res.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.updatePost.postAuth.1.req.vtl']).toMatchSnapshot();

    // Verify Delete mutation authorization rule
    expect(out.resolvers['Mutation.deletePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.deletePost.auth.1.res.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.deletePost.postAuth.1.req.vtl']).toMatchSnapshot();
  });

  it('should successfully transform iam auth rules', async () => {
    const validSchema = `
      type PostPrivate @model
        @auth(rules: [
          {allow: private, provider: iam}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type PostPublic @model
        @auth(rules: [
          {allow: public, provider: iam}
        ]) {
          id: ID! @primaryKey
          title: String!
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      authConfig,
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      synthParameters: {
        identityPoolId: 'TEST_IDENTITY_POOL_ID',
      },
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    const authResolvers = [
      // Private
      'Mutation.createPostPrivate.auth.1.req.vtl',
      'Mutation.createPostPrivate.postAuth.1.req.vtl',
      'Mutation.updatePostPrivate.auth.1.req.vtl',
      'Mutation.updatePostPrivate.auth.1.res.vtl',
      'Mutation.updatePostPrivate.postAuth.1.req.vtl',
      'Mutation.deletePostPrivate.auth.1.req.vtl',
      'Mutation.deletePostPrivate.auth.1.res.vtl',
      'Mutation.deletePostPrivate.postAuth.1.req.vtl',
      // Public
      'Mutation.createPostPublic.auth.1.req.vtl',
      'Mutation.createPostPublic.postAuth.1.req.vtl',
      'Mutation.updatePostPublic.auth.1.req.vtl',
      'Mutation.updatePostPublic.auth.1.res.vtl',
      'Mutation.updatePostPublic.postAuth.1.req.vtl',
      'Mutation.deletePostPublic.auth.1.req.vtl',
      'Mutation.deletePostPublic.auth.1.res.vtl',
      'Mutation.deletePostPublic.postAuth.1.req.vtl',
    ];

    authResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toBeDefined();
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

  it('should successfully transform IdentityPool auth rules', async () => {
    const validSchema = `
      type PostPrivate @model
        @auth(rules: [
          {allow: private, provider: identityPool}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type PostPublic @model
        @auth(rules: [
          {allow: public, provider: identityPool}
        ]) {
          id: ID! @primaryKey
          title: String!
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      authConfig,
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      synthParameters: {
        identityPoolId: 'TEST_IDENTITY_POOL_ID',
      },
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    const authResolvers = [
      // Private
      'Mutation.createPostPrivate.auth.1.req.vtl',
      'Mutation.createPostPrivate.postAuth.1.req.vtl',
      'Mutation.updatePostPrivate.auth.1.req.vtl',
      'Mutation.updatePostPrivate.auth.1.res.vtl',
      'Mutation.updatePostPrivate.postAuth.1.req.vtl',
      'Mutation.deletePostPrivate.auth.1.req.vtl',
      'Mutation.deletePostPrivate.auth.1.res.vtl',
      'Mutation.deletePostPrivate.postAuth.1.req.vtl',
      // Public
      'Mutation.createPostPublic.auth.1.req.vtl',
      'Mutation.createPostPublic.postAuth.1.req.vtl',
      'Mutation.updatePostPublic.auth.1.req.vtl',
      'Mutation.updatePostPublic.auth.1.res.vtl',
      'Mutation.updatePostPublic.postAuth.1.req.vtl',
      'Mutation.deletePostPublic.auth.1.req.vtl',
      'Mutation.deletePostPublic.auth.1.res.vtl',
      'Mutation.deletePostPublic.postAuth.1.req.vtl',
    ];

    authResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toBeDefined();
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

  it('should not throw error if auth is defined on a field', async () => {
    const validSchema = `
      type Post @model
        @auth(rules: [
          {allow: private, provider: iam}
          {allow: public, provider: iam}
        ]) {
          id: ID! @primaryKey
            @auth(rules: [
              {allow: private, provider: iam}
            ])
          title: String!
            @auth(rules: [
              {allow: private, provider: iam}
            ])
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [],
    };

    expect(() =>
      testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
        authConfig,
        dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      }),
    ).not.toThrowError();
  });

  it('should not throw error if auth is defined on a field with identityPool', async () => {
    const validSchema = `
      type Post @model
        @auth(rules: [
          {allow: private, provider: identityPool}
          {allow: public, provider: identityPool}
        ]) {
          id: ID! @primaryKey
            @auth(rules: [
              {allow: private, provider: identityPool}
            ])
          title: String!
            @auth(rules: [
              {allow: private, provider: identityPool}
            ])
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [],
    };

    expect(() =>
      testTransform({
        schema: validSchema,
        transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
        authConfig,
        dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      }),
    ).not.toThrowError();
  });

  it('should allow field auth on mutation type', async () => {
    const validSchema = `
      type Post @model
        @auth(rules: [
          {allow: private, provider: iam}
          {allow: public, provider: iam}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type Mutation {
        createCustomModel: Post @auth(rules: [{allow: private, provider: iam}])
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      authConfig,
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
    });

    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);
  });

  test('admin role should present in stash for rds model', () => {
    const validSchema = `
    type Post @model @auth(rules: [{allow: public}]) {
      id: ID! @primaryKey
      title: String!
      createdAt: String
      updatedAt: String
    }`;
    const out = testTransform({
      schema: validSchema,
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
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
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    expect(out.schema).toContain('Post @aws_api_key @aws_iam');
    expectStashValueLike(out, 'Post', ADMIN_UI_ADMIN_ROLES);
  });
});

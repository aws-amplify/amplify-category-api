import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { constructDataSourceStrategies, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { AuthTransformer } from '../graphql-auth-transformer';

describe('Verify RDS Model level Auth rules on subscriptions:', () => {
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

    // Verify Create subscription authorization rule
    expect(out.resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onCreatePost.res.vtl']).toMatchSnapshot();

    // Verify Update subscription authorization rule
    expect(out.resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onUpdatePost.res.vtl']).toMatchSnapshot();

    // Verify Delete subscription authorization rule
    expect(out.resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onDeletePost.res.vtl']).toMatchSnapshot();
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
      'Subscription.onCreatePostPrivate.auth.1.req.vtl',
      'Subscription.onCreatePostPrivate.postAuth.1.req.vtl',
      'Subscription.onCreatePostPrivate.res.vtl',
      'Subscription.onUpdatePostPrivate.auth.1.req.vtl',
      'Subscription.onUpdatePostPrivate.postAuth.1.req.vtl',
      'Subscription.onUpdatePostPrivate.res.vtl',
      'Subscription.onDeletePostPrivate.auth.1.req.vtl',
      'Subscription.onDeletePostPrivate.postAuth.1.req.vtl',
      'Subscription.onDeletePostPrivate.res.vtl',
      // Owner
      'Subscription.onCreatePostSingleOwner.auth.1.req.vtl',
      'Subscription.onCreatePostSingleOwner.postAuth.1.req.vtl',
      'Subscription.onCreatePostSingleOwner.res.vtl',
      'Subscription.onUpdatePostSingleOwner.auth.1.req.vtl',
      'Subscription.onUpdatePostSingleOwner.postAuth.1.req.vtl',
      'Subscription.onUpdatePostSingleOwner.res.vtl',
      'Subscription.onDeletePostSingleOwner.auth.1.req.vtl',
      'Subscription.onDeletePostSingleOwner.postAuth.1.req.vtl',
      'Subscription.onDeletePostSingleOwner.res.vtl',
      // Owners
      'Subscription.onCreatePostOwners.auth.1.req.vtl',
      'Subscription.onCreatePostOwners.postAuth.1.req.vtl',
      'Subscription.onCreatePostOwners.res.vtl',
      'Subscription.onUpdatePostOwners.auth.1.req.vtl',
      'Subscription.onUpdatePostOwners.postAuth.1.req.vtl',
      'Subscription.onUpdatePostOwners.res.vtl',
      'Subscription.onDeletePostOwners.auth.1.req.vtl',
      'Subscription.onDeletePostOwners.postAuth.1.req.vtl',
      'Subscription.onDeletePostOwners.res.vtl',
      // Static Groups
      'Subscription.onCreatePostStaticGroups.auth.1.req.vtl',
      'Subscription.onCreatePostStaticGroups.postAuth.1.req.vtl',
      'Subscription.onCreatePostStaticGroups.res.vtl',
      'Subscription.onUpdatePostStaticGroups.auth.1.req.vtl',
      'Subscription.onUpdatePostStaticGroups.postAuth.1.req.vtl',
      'Subscription.onUpdatePostStaticGroups.res.vtl',
      'Subscription.onDeletePostStaticGroups.auth.1.req.vtl',
      'Subscription.onDeletePostStaticGroups.postAuth.1.req.vtl',
      'Subscription.onDeletePostStaticGroups.res.vtl',
      // Group
      'Subscription.onCreatePostSingleGroup.auth.1.req.vtl',
      'Subscription.onCreatePostSingleGroup.postAuth.1.req.vtl',
      'Subscription.onCreatePostSingleGroup.res.vtl',
      'Subscription.onUpdatePostSingleGroup.auth.1.req.vtl',
      'Subscription.onUpdatePostSingleGroup.postAuth.1.req.vtl',
      'Subscription.onUpdatePostSingleGroup.res.vtl',
      'Subscription.onDeletePostSingleGroup.auth.1.req.vtl',
      'Subscription.onDeletePostSingleGroup.postAuth.1.req.vtl',
      'Subscription.onDeletePostSingleGroup.res.vtl',
      // Groups
      'Subscription.onCreatePostGroups.auth.1.req.vtl',
      'Subscription.onCreatePostGroups.postAuth.1.req.vtl',
      'Subscription.onCreatePostGroups.res.vtl',
      'Subscription.onUpdatePostGroups.auth.1.req.vtl',
      'Subscription.onUpdatePostGroups.postAuth.1.req.vtl',
      'Subscription.onUpdatePostGroups.res.vtl',
      'Subscription.onDeletePostGroups.auth.1.req.vtl',
      'Subscription.onDeletePostGroups.postAuth.1.req.vtl',
      'Subscription.onDeletePostGroups.res.vtl',
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
      'Subscription.onCreatePostPrivate.auth.1.req.vtl',
      'Subscription.onCreatePostPrivate.postAuth.1.req.vtl',
      'Subscription.onCreatePostPrivate.res.vtl',
      'Subscription.onUpdatePostPrivate.auth.1.req.vtl',
      'Subscription.onUpdatePostPrivate.postAuth.1.req.vtl',
      'Subscription.onUpdatePostPrivate.res.vtl',
      'Subscription.onDeletePostPrivate.auth.1.req.vtl',
      'Subscription.onDeletePostPrivate.postAuth.1.req.vtl',
      'Subscription.onDeletePostPrivate.res.vtl',
      // Owner
      'Subscription.onCreatePostSingleOwner.auth.1.req.vtl',
      'Subscription.onCreatePostSingleOwner.postAuth.1.req.vtl',
      'Subscription.onCreatePostSingleOwner.res.vtl',
      'Subscription.onUpdatePostSingleOwner.auth.1.req.vtl',
      'Subscription.onUpdatePostSingleOwner.postAuth.1.req.vtl',
      'Subscription.onUpdatePostSingleOwner.res.vtl',
      'Subscription.onDeletePostSingleOwner.auth.1.req.vtl',
      'Subscription.onDeletePostSingleOwner.postAuth.1.req.vtl',
      'Subscription.onDeletePostSingleOwner.res.vtl',
      // Owners
      'Subscription.onCreatePostOwners.auth.1.req.vtl',
      'Subscription.onCreatePostOwners.postAuth.1.req.vtl',
      'Subscription.onCreatePostOwners.res.vtl',
      'Subscription.onUpdatePostOwners.auth.1.req.vtl',
      'Subscription.onUpdatePostOwners.postAuth.1.req.vtl',
      'Subscription.onUpdatePostOwners.res.vtl',
      'Subscription.onDeletePostOwners.auth.1.req.vtl',
      'Subscription.onDeletePostOwners.postAuth.1.req.vtl',
      'Subscription.onDeletePostOwners.res.vtl',
      // Static Groups
      'Subscription.onCreatePostStaticGroups.auth.1.req.vtl',
      'Subscription.onCreatePostStaticGroups.postAuth.1.req.vtl',
      'Subscription.onCreatePostStaticGroups.res.vtl',
      'Subscription.onUpdatePostStaticGroups.auth.1.req.vtl',
      'Subscription.onUpdatePostStaticGroups.postAuth.1.req.vtl',
      'Subscription.onUpdatePostStaticGroups.res.vtl',
      'Subscription.onDeletePostStaticGroups.auth.1.req.vtl',
      'Subscription.onDeletePostStaticGroups.postAuth.1.req.vtl',
      'Subscription.onDeletePostStaticGroups.res.vtl',
      // Group
      'Subscription.onCreatePostSingleGroup.auth.1.req.vtl',
      'Subscription.onCreatePostSingleGroup.postAuth.1.req.vtl',
      'Subscription.onCreatePostSingleGroup.res.vtl',
      'Subscription.onUpdatePostSingleGroup.auth.1.req.vtl',
      'Subscription.onUpdatePostSingleGroup.postAuth.1.req.vtl',
      'Subscription.onUpdatePostSingleGroup.res.vtl',
      'Subscription.onDeletePostSingleGroup.auth.1.req.vtl',
      'Subscription.onDeletePostSingleGroup.postAuth.1.req.vtl',
      'Subscription.onDeletePostSingleGroup.res.vtl',
      // Groups
      'Subscription.onCreatePostGroups.auth.1.req.vtl',
      'Subscription.onCreatePostGroups.postAuth.1.req.vtl',
      'Subscription.onCreatePostGroups.res.vtl',
      'Subscription.onUpdatePostGroups.auth.1.req.vtl',
      'Subscription.onUpdatePostGroups.postAuth.1.req.vtl',
      'Subscription.onUpdatePostGroups.res.vtl',
      'Subscription.onDeletePostGroups.auth.1.req.vtl',
      'Subscription.onDeletePostGroups.postAuth.1.req.vtl',
      'Subscription.onDeletePostGroups.res.vtl',
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

    // Verify Create subscription authorization rule
    expect(out.resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onCreatePost.postAuth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onCreatePost.res.vtl']).toMatchSnapshot();

    // Verify Update subscription authorization rule
    expect(out.resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onUpdatePost.postAuth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onUpdatePost.res.vtl']).toMatchSnapshot();

    // Verify Delete subscription authorization rule
    expect(out.resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onDeletePost.postAuth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Subscription.onDeletePost.res.vtl']).toMatchSnapshot();
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
      'Subscription.onCreatePostPrivate.auth.1.req.vtl',
      'Subscription.onCreatePostPrivate.postAuth.1.req.vtl',
      'Subscription.onCreatePostPrivate.res.vtl',
      'Subscription.onUpdatePostPrivate.auth.1.req.vtl',
      'Subscription.onUpdatePostPrivate.postAuth.1.req.vtl',
      'Subscription.onUpdatePostPrivate.res.vtl',
      'Subscription.onDeletePostPrivate.auth.1.req.vtl',
      'Subscription.onDeletePostPrivate.postAuth.1.req.vtl',
      'Subscription.onDeletePostPrivate.res.vtl',
      // Public
      'Subscription.onCreatePostPublic.auth.1.req.vtl',
      'Subscription.onCreatePostPublic.postAuth.1.req.vtl',
      'Subscription.onCreatePostPublic.res.vtl',
      'Subscription.onUpdatePostPublic.auth.1.req.vtl',
      'Subscription.onUpdatePostPublic.postAuth.1.req.vtl',
      'Subscription.onUpdatePostPublic.res.vtl',
      'Subscription.onDeletePostPublic.auth.1.req.vtl',
      'Subscription.onDeletePostPublic.postAuth.1.req.vtl',
      'Subscription.onDeletePostPublic.res.vtl',
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
      'Subscription.onCreatePostPrivate.auth.1.req.vtl',
      'Subscription.onCreatePostPrivate.postAuth.1.req.vtl',
      'Subscription.onCreatePostPrivate.res.vtl',
      'Subscription.onUpdatePostPrivate.auth.1.req.vtl',
      'Subscription.onUpdatePostPrivate.postAuth.1.req.vtl',
      'Subscription.onUpdatePostPrivate.res.vtl',
      'Subscription.onDeletePostPrivate.auth.1.req.vtl',
      'Subscription.onDeletePostPrivate.postAuth.1.req.vtl',
      'Subscription.onDeletePostPrivate.res.vtl',
      // Public
      'Subscription.onCreatePostPublic.auth.1.req.vtl',
      'Subscription.onCreatePostPublic.postAuth.1.req.vtl',
      'Subscription.onCreatePostPublic.res.vtl',
      'Subscription.onUpdatePostPublic.auth.1.req.vtl',
      'Subscription.onUpdatePostPublic.postAuth.1.req.vtl',
      'Subscription.onUpdatePostPublic.res.vtl',
      'Subscription.onDeletePostPublic.auth.1.req.vtl',
      'Subscription.onDeletePostPublic.postAuth.1.req.vtl',
      'Subscription.onDeletePostPublic.res.vtl',
    ];

    authResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toBeDefined();
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

  it('should allow field auth on subscription type', async () => {
    const validSchema = `
      type Post @model
        @auth(rules: [
          {allow: private, provider: iam}
          {allow: public, provider: iam}
        ]) {
          id: ID! @primaryKey
          title: String!
      }

      type Subscription {
        onCustomCreateModel: Post @auth(rules: [{allow: private, provider: iam}])
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
});

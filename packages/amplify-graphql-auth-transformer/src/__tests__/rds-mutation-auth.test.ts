import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '../graphql-auth-transformer';

describe('Verify RDS Model level Auth rules on mutations:', () => {
  it('should successfully transform apiKey auth rule', async () => {
    const validSchema = `
      type Post @model
        @auth(rules: [{allow: public}]) {
          id: ID!
          title: String!
      }
    `;

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer({identityPoolId: 'TEST_IDENTITY_POOL_ID'})],
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MySQL',
            provisionDB: false,
          },
        }),
      ),
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
          id: ID!
          title: String!
      }

      type PostSingleOwner @model
        @auth(rules: [
          {allow: owner}
        ]) {
          id: ID!
          title: String!
      }

      type PostOwners @model
        @auth(rules: [
          {allow: owner, ownerField: "owners"}
        ]) {
          id: ID!
          title: String!
          owners: [String]
      }

      type PostStaticGroups @model
        @auth(rules: [
          {allow: groups, groups: ["Admin", "Moderator"]}
        ]) {
          id: ID!
          title: String!
      }

      type PostGroups @model
        @auth(rules: [
          {allow: groups, groupsField: "groups"}
        ]) {
          id: ID!
          title: String!
          groups: [String]
      }

      type PostSingleGroup @model
        @auth(rules: [
          {allow: groups, groupsField: "group"}
        ]) {
          id: ID!
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

    const modelToDatasourceMap = new Map();
    ['PostPrivate', 'PostSingleOwner', 'PostOwners', 'PostStaticGroups', 'PostSingleGroup', 'PostGroups'].forEach((model) => {
      modelToDatasourceMap.set(model, {
        dbType: 'MySQL',
        provisionDB: false,
      });
    });

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer({identityPoolId: 'TEST_IDENTITY_POOL_ID'})],
      authConfig,
      modelToDatasourceMap,
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
          id: ID!
          title: String!
      }

      type PostSingleOwner @model
        @auth(rules: [
          {allow: owner, provider: oidc}
        ]) {
          id: ID!
          title: String!
      }

      type PostOwners @model
        @auth(rules: [
          {allow: owner, ownerField: "owners", provider: oidc}
        ]) {
          id: ID!
          title: String!
          owners: [String]
      }

      type PostStaticGroups @model
        @auth(rules: [
          {allow: groups, groups: ["Admin", "Moderator"], provider: oidc}
        ]) {
          id: ID!
          title: String!
      }

      type PostGroups @model
        @auth(rules: [
          {allow: groups, groupsField: "groups", provider: oidc}
        ]) {
          id: ID!
          title: String!
          groups: [String]
      }

      type PostSingleGroup @model
        @auth(rules: [
          {allow: groups, groupsField: "group", provider: oidc}
        ]) {
          id: ID!
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

    const modelToDatasourceMap = new Map();
    ['PostPrivate', 'PostSingleOwner', 'PostOwners', 'PostStaticGroups', 'PostSingleGroup', 'PostGroups'].forEach((model) => {
      modelToDatasourceMap.set(model, {
        dbType: 'MySQL',
        provisionDB: false,
      });
    });

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer({identityPoolId: 'TEST_IDENTITY_POOL_ID'})],
      authConfig,
      modelToDatasourceMap,
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
          id: ID!
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
      transformers: [new ModelTransformer(), new AuthTransformer({identityPoolId: 'TEST_IDENTITY_POOL_ID'})],
      authConfig,
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MySQL',
            provisionDB: false,
          },
        }),
      ),
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
          id: ID!
          title: String!
      }

      type PostPublic @model
        @auth(rules: [
          {allow: public, provider: iam}
        ]) {
          id: ID!
          title: String!
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [],
    };

    const modelToDatasourceMap = new Map();
    ['PostPrivate', 'PostPublic'].forEach((model) => {
      modelToDatasourceMap.set(model, {
        dbType: 'MySQL',
        provisionDB: false,
      });
    });

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer({identityPoolId: 'TEST_IDENTITY_POOL_ID'})],
      authConfig,
      modelToDatasourceMap,
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
});

import { parse } from 'graphql';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { PrimaryKeyTransformer, IndexTransformer } from '@aws-amplify/graphql-index-transformer';
import { validateModelSchema, constructDataSourceStrategies, MYSQL_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import { ResourceConstants } from 'graphql-transformer-common';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { testTransform, mockSqlDataSourceStrategy } from '@aws-amplify/graphql-transformer-test-utils';
import { AuthTransformer } from '../graphql-auth-transformer';
import { getField, getObjectType } from './test-helpers';

describe('owner based @auth', () => {
  test('auth transformer validation happy case', () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
      type Post @model @auth(rules: [{allow: owner}]) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const resources = out.rootStack.Resources;
    expect(resources).toBeDefined();
    expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual('AMAZON_COGNITO_USER_POOLS');
  });

  test('owner field where the field is a list', () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
      type Post @model @auth(rules: [{allow: owner, ownerField: "editors" }]) {
        id: ID!
        title: String!
        editors: [String]
        createdAt: String
        updatedAt: String
      }`;
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const resources = out.rootStack.Resources;
    expect(resources).toBeDefined();
    expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual('AMAZON_COGNITO_USER_POOLS');
    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.updatePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.deletePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
  });

  test('owner where field is "::" delimited string', () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
    type Post @model @auth(rules: [{allow: owner, identityClaim: "sub::username" }]) {
      id: ID!
      title: String!
      createdAt: String
      updatedAt: String
    }`;
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const resources = out.rootStack.Resources;
    expect(resources).toBeDefined();
    expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual('AMAZON_COGNITO_USER_POOLS');
    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.updatePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.deletePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
  });

  test('owner where field is "::" delimited with only mutation', () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
    type Post @model @auth(rules: [{allow: owner, operations: [create, delete] }]) {
      id: ID!
      title: String!
    }`;
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out.resolvers['Post.owner.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post.owner.res.vtl']).toMatchSnapshot();
  });

  test('owner field with subscriptions', () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
    type Post @model @auth(rules: [
        {allow: owner, ownerField: "postOwner"}
    ]){
      id: ID!
      title: String
      postOwner: String
    }`;
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });

    expect(out).toBeDefined();

    // expect 'postOwner' as an argument for subscription operations
    expect(out.schema).toContain('onCreatePost(filter: ModelSubscriptionPostFilterInput, postOwner: String)');
    expect(out.schema).toContain('onUpdatePost(filter: ModelSubscriptionPostFilterInput, postOwner: String)');
    expect(out.schema).toContain('onDeletePost(filter: ModelSubscriptionPostFilterInput, postOwner: String)');

    // expect logic in the resolvers to check for postOwner args as an allowed owner
    expect(out.resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toContain(
      '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.postOwner, null) )',
    );
    expect(out.resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toContain(
      '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.postOwner, null) )',
    );
    expect(out.resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toContain(
      '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.postOwner, null) )',
    );
  });

  test('multiple owner rules with subscriptions', () => {
    const validSchema = `
          type Post @model
              @auth(rules: [
                { allow: owner },
                { allow: owner, ownerField: "editor", operations: [read, update] }
              ])
          {
              id: ID!
              title: String
              owner: String
              editor: String
          }`;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });

    expect(out).toBeDefined();

    // expect 'owner' and 'editors' as arguments for subscription operations
    expect(out.schema).toContain('onCreatePost(filter: ModelSubscriptionPostFilterInput, owner: String, editor: String)');
    expect(out.schema).toContain('onUpdatePost(filter: ModelSubscriptionPostFilterInput, owner: String, editor: String)');
    expect(out.schema).toContain('onDeletePost(filter: ModelSubscriptionPostFilterInput, owner: String, editor: String)');

    // expect logic in the resolvers to check for owner args as an allowedOwner
    expect(out.resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toContain(
      '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.owner, null) )',
    );
    expect(out.resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toContain(
      '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.owner, null) )',
    );
    expect(out.resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toContain(
      '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.owner, null) )',
    );

    // expect logic in the resolvers to check for editor args as an allowedOwner
    expect(out.resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toContain(
      '#set( $ownerEntity1 = $util.defaultIfNull($ctx.args.editor, null) )',
    );
    expect(out.resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toContain(
      '#set( $ownerEntity1 = $util.defaultIfNull($ctx.args.editor, null) )',
    );
    expect(out.resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toContain(
      '#set( $ownerEntity1 = $util.defaultIfNull($ctx.args.editor, null) )',
    );
  });

  test('implicit owner fields get added to the type', () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
    type Post @model
              @auth(rules: [
                  {allow: owner, ownerField: "postOwner"}
                  { allow: owner, ownerField: "customOwner", identityClaim: "sub"}
              ])
          {
              id: ID!
              title: String
          }
    `;
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();

    const schema = parse(out.schema);
    const postType = getObjectType(schema, 'Post');
    expect(postType).toBeDefined();

    const postOwnerField = getField(postType!, 'postOwner');
    expect(postOwnerField).toBeDefined();

    const customOwner = getField(postType!, 'customOwner');
    expect(customOwner).toBeDefined();

    /* eslint-disable @typescript-eslint/no-explicit-any */
    expect((postOwnerField as any).type.name.value).toEqual('String');
    expect((customOwner as any).type.name.value).toEqual('String');
    /* eslint-enable */
  });

  test('implicit owner fields from field level auth get added to the type', () => {
    const validSchema = `
          type Post @model
          {
              id: ID
              title: String
              protectedField: String @auth(rules: [
                  {allow: owner, ownerField: "postOwner"}
                  { allow: owner, ownerField: "customOwner", identityClaim: "sub"}
              ])
          }`;
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    const postType = getObjectType(schema, 'Post');
    expect(postType).toBeDefined();

    const postOwnerField = getField(postType!, 'postOwner');
    expect(postOwnerField).toBeDefined();

    const customOwner = getField(postType!, 'customOwner');
    expect(customOwner).toBeDefined();

    /* eslint-disable @typescript-eslint/no-explicit-any */
    expect((postOwnerField as any).type.name.value).toEqual('String');
    expect((customOwner as any).type.name.value).toEqual('String');
    /* eslint-enable */
  });

  test('owner fields on primaryKey create auth filter for scan operation', () => {
    const validSchema = `
    type FamilyMember @model @auth(rules: [
      {allow: owner, ownerField: "parent", identityClaim: "sub", operations: [read] },
      {allow: owner, ownerField: "child", identityClaim: "sub", operations: [read] }
    ]){
      parent: ID! @primaryKey(sortKeyFields: ["child"]) @index(name: "byParent", queryField: "byParent")
      child: ID! @index(name: "byChild", queryField: "byChild")
      createdAt: AWSDateTime
      updatedAt: AWSDateTime
    }`;
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    const familyMemberType = getObjectType(schema, 'FamilyMember');
    expect(familyMemberType).toBeDefined();

    // use double type as it's non-null
    const parentOwnerField = getField(familyMemberType!, 'parent');
    expect(parentOwnerField).toBeDefined();

    const childOwnerField = getField(familyMemberType!, 'child');
    expect(childOwnerField).toBeDefined();

    /* eslint-disable @typescript-eslint/no-explicit-any */
    expect((parentOwnerField as any).type.type.name.value).toEqual('ID');
    expect((childOwnerField as any).type.type.name.value).toEqual('ID');
    /* eslint-enable */

    expect(out.resolvers['Query.listFamilyMembers.auth.1.req.vtl']).toMatchSnapshot();
  });

  test('@auth on relational schema with LSI and GSI', () => {
    const inputSchema = `
      type User @model
        @auth(rules: [
          {allow: owner, ownerField: "sub", identityClaim: "sub"}
        ]) {
          sub: String! @primaryKey
          following: [Follow]! @hasMany(indexName: "byFollower", fields: ["sub"])
          followers: [Follow]! @hasMany(indexName: "byFollowed", fields: ["sub"])
      }

      type Follow
        @model
        @auth(rules: [
          {allow: owner, ownerField: "ownerSub", identityClaim: "sub"}
        ]) {
        ownerSub: String!
          @primaryKey(sortKeyFields: ["followed_sub"])
          @index(name: "byFollower", sortKeyFields: ["createdAt"])

        followed_sub: String! @index(name: "byFollowed", sortKeyFields: ["createdAt"])
        createdAt: AWSDateTime!
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: inputSchema,
      authConfig,
      transformParameters: {
        secondaryKeyAsGSI: false,
      },
      transformers: [
        new ModelTransformer(),
        new HasManyTransformer(),
        new IndexTransformer(),
        new PrimaryKeyTransformer(),
        new AuthTransformer(),
      ],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
  });

  test('@auth on schema with LSI and GSI', () => {
    const inputSchema = `
      type Model @model @auth(rules: [{allow: public, provider: apiKey}]) {
        user: String! @primaryKey(sortKeyFields: ["channel", "token", "secret"]) @index(name: "byUser", queryField: "listModelsByUser", sortKeyFields: ["channel"])
        channel: String! @index(name: "byChannel", queryField: "listModelsByChannel", sortKeyFields: ["user"])
        token: String!
        secret: String!
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'API_KEY',
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: inputSchema,
      authConfig,
      transformParameters: {
        secondaryKeyAsGSI: false,
      },
      transformers: [
        new ModelTransformer(),
        new HasManyTransformer(),
        new IndexTransformer(),
        new PrimaryKeyTransformer(),
        new AuthTransformer(),
      ],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
  });

  test('owner field with custom cognito field', () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
    type Post @model @auth(rules: [{allow: owner, identityClaim: "custom:my_field" }]) {
      id: ID!
      title: String!
      createdAt: String
      updatedAt: String
    }`;

    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });

    expect(out).toBeDefined();
    const resources = out.rootStack.Resources;
    expect(resources).toBeDefined();
    expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual('AMAZON_COGNITO_USER_POOLS');
    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.updatePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.deletePost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
  });

  it('should successfully transform simple valid schema with implicit fields', async () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
      type Todo @model @auth(rules: [{ allow: owner }]) {
        content: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);
    expect(out.schema).toMatchSnapshot();
  });

  it('should not add duplicate implicit field when already included', async () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
      type Todo @model @auth(rules: [{ allow: owner }]) {
        owner: String
        content: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);
    expect(out.schema).toMatchSnapshot();
  });

  it('should successfully transform simple valid schema with implicit fields', async () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
      type Todo @model @auth(rules: [{ allow: owner }]) {
        id: ID! @primaryKey
        content: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mockSqlDataSourceStrategy()),
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);
    expect(out.schema).toMatchSnapshot();
  });

  it('should not add subscription filter with implicit owner field when subscription is disabled', async () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
      type Todo @model(subscriptions: null) @auth(rules: [{ allow: owner }]) {
        owner: String
        content: String
      }
    `;

    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);
    expect(out.schema).toMatchSnapshot();
  });

  test('@auth in bidirectional relational schema using references', () => {
    const inputSchema = `
      type Primary @model @auth(rules: [{ allow: owner }]) {
        id: String! @primaryKey
        owner: String
        relatedMany: [RelatedMany] @hasMany(references: ["primaryId"])
        relatedOne: RelatedOne @hasOne(references: ["primaryId"])
      }

      type RelatedMany @model @auth(rules: [{ allow: owner }]) {
        id: String! @primaryKey
        owner: String
        primaryId: String
        primary: Primary @belongsTo(references: ["primaryId"])
      }

      type RelatedOne @model @auth(rules: [{ allow: owner }]) {
        id: String! @primaryKey
        owner: String
        primaryId: String
        primary: Primary @belongsTo(references: ["primaryId"])
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };

    const out = testTransform({
      schema: inputSchema,
      authConfig,
      transformParameters: {
        secondaryKeyAsGSI: false,
      },
      transformers: [
        new ModelTransformer(),
        new HasManyTransformer(),
        new HasOneTransformer(),
        new BelongsToTransformer(),
        new PrimaryKeyTransformer(),
        new AuthTransformer(),
      ],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);
  });

  describe('with identity claim feature flag disabled', () => {
    test('auth transformer validation happy case', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();
      const resources = out.rootStack.Resources;
      expect(resources).toBeDefined();
      expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual(
        'AMAZON_COGNITO_USER_POOLS',
      );
    });

    test('owner field where the field is a list', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, ownerField: "editors" }]) {
          id: ID!
          title: String!
          editors: [String]
          createdAt: String
          updatedAt: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
        transformParameters: {
          useSubUsernameForDefaultIdentityClaim: false,
        },
      });
      expect(out).toBeDefined();
      const resources = out.rootStack.Resources;
      expect(resources).toBeDefined();
      expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual(
        'AMAZON_COGNITO_USER_POOLS',
      );
      expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
      expect(out.resolvers['Mutation.updatePost.auth.1.req.vtl']).toMatchSnapshot();
      expect(out.resolvers['Mutation.deletePost.auth.1.req.vtl']).toMatchSnapshot();
      expect(out.resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
      expect(out.resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
    });

    test('owner where field is "::" delimited string', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, identityClaim: "sub::username" }]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
        transformParameters: {
          useSubUsernameForDefaultIdentityClaim: false,
        },
      });
      expect(out).toBeDefined();
      const resources = out.rootStack.Resources;
      expect(resources).toBeDefined();
      expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual(
        'AMAZON_COGNITO_USER_POOLS',
      );
      expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
      expect(out.resolvers['Mutation.updatePost.auth.1.req.vtl']).toMatchSnapshot();
      expect(out.resolvers['Mutation.deletePost.auth.1.req.vtl']).toMatchSnapshot();
      expect(out.resolvers['Query.getPost.auth.1.req.vtl']).toMatchSnapshot();
      expect(out.resolvers['Query.listPosts.auth.1.req.vtl']).toMatchSnapshot();
    });

    test('owner field with subscriptions', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [
            {allow: owner, ownerField: "postOwner"}
        ]){
          id: ID!
          title: String
          postOwner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // expect 'postOwner' as an argument for subscription operations
      expect(out.schema).toContain('onCreatePost(filter: ModelSubscriptionPostFilterInput, postOwner: String)');
      expect(out.schema).toContain('onUpdatePost(filter: ModelSubscriptionPostFilterInput, postOwner: String)');
      expect(out.schema).toContain('onDeletePost(filter: ModelSubscriptionPostFilterInput, postOwner: String)');

      // expect logic in the resolvers to check for postOwner args as an allowed owner
      expect(out.resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toContain(
        '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.postOwner, null) )',
      );
      expect(out.resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toContain(
        '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.postOwner, null) )',
      );
      expect(out.resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toContain(
        '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.postOwner, null) )',
      );
    });

    test('multiple owner rules with subscriptions', () => {
      const validSchema = `
            type Post @model
                @auth(rules: [
                  { allow: owner },
                  { allow: owner, ownerField: "editor", operations: [read, update] }
                ])
            {
                id: ID!
                title: String
                owner: String
                editor: String
            }`;

      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // expect 'owner' and 'editors' as arguments for subscription operations
      expect(out.schema).toContain('onCreatePost(filter: ModelSubscriptionPostFilterInput, owner: String, editor: String)');
      expect(out.schema).toContain('onUpdatePost(filter: ModelSubscriptionPostFilterInput, owner: String, editor: String)');
      expect(out.schema).toContain('onDeletePost(filter: ModelSubscriptionPostFilterInput, owner: String, editor: String)');

      // expect logic in the resolvers to check for owner args as an allowedOwner
      expect(out.resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toContain(
        '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.owner, null) )',
      );
      expect(out.resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toContain(
        '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.owner, null) )',
      );
      expect(out.resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toContain(
        '#set( $ownerEntity0 = $util.defaultIfNull($ctx.args.owner, null) )',
      );

      // expect logic in the resolvers to check for editor args as an allowedOwner
      expect(out.resolvers['Subscription.onCreatePost.auth.1.req.vtl']).toContain(
        '#set( $ownerEntity1 = $util.defaultIfNull($ctx.args.editor, null) )',
      );
      expect(out.resolvers['Subscription.onUpdatePost.auth.1.req.vtl']).toContain(
        '#set( $ownerEntity1 = $util.defaultIfNull($ctx.args.editor, null) )',
      );
      expect(out.resolvers['Subscription.onDeletePost.auth.1.req.vtl']).toContain(
        '#set( $ownerEntity1 = $util.defaultIfNull($ctx.args.editor, null) )',
      );
    });

    test('implicit owner fields get added to the type', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
      type Post @model
                @auth(rules: [
                    {allow: owner, ownerField: "postOwner"}
                    { allow: owner, ownerField: "customOwner", identityClaim: "sub"}
                ])
            {
                id: ID!
                title: String
            }
      `;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      const schema = parse(out.schema);
      const postType = getObjectType(schema, 'Post');
      expect(postType).toBeDefined();

      const postOwnerField = getField(postType!, 'postOwner');
      expect(postOwnerField).toBeDefined();

      const customOwner = getField(postType!, 'customOwner');
      expect(customOwner).toBeDefined();

      /* eslint-disable @typescript-eslint/no-explicit-any */
      expect((postOwnerField as any).type.name.value).toEqual('String');
      expect((customOwner as any).type.name.value).toEqual('String');
      /* eslint-enable */
    });

    test('implicit owner fields from field level auth get added to the type', () => {
      const validSchema = `
            type Post @model
            {
                id: ID
                title: String
                protectedField: String @auth(rules: [
                    {allow: owner, ownerField: "postOwner"}
                    { allow: owner, ownerField: "customOwner", identityClaim: "sub"}
                ])
            }`;
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();
      const schema = parse(out.schema);
      const postType = getObjectType(schema, 'Post');
      expect(postType).toBeDefined();

      const postOwnerField = getField(postType!, 'postOwner');
      expect(postOwnerField).toBeDefined();

      const customOwner = getField(postType!, 'customOwner');
      expect(customOwner).toBeDefined();

      /* eslint-disable @typescript-eslint/no-explicit-any */
      expect((postOwnerField as any).type.name.value).toEqual('String');
      expect((customOwner as any).type.name.value).toEqual('String');
      /* eslint-enable */
    });

    test('owner fields on primaryKey create auth filter for scan operation', () => {
      const validSchema = `
      type FamilyMember @model @auth(rules: [
        {allow: owner, ownerField: "parent", identityClaim: "sub", operations: [read] },
        {allow: owner, ownerField: "child", identityClaim: "sub", operations: [read] }
      ]){
        parent: ID! @primaryKey(sortKeyFields: ["child"]) @index(name: "byParent", queryField: "byParent")
        child: ID! @index(name: "byChild", queryField: "byChild")
        createdAt: AWSDateTime
        updatedAt: AWSDateTime
      }`;
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformParameters: {
          useSubUsernameForDefaultIdentityClaim: false,
        },
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();
      const schema = parse(out.schema);
      const familyMemberType = getObjectType(schema, 'FamilyMember');
      expect(familyMemberType).toBeDefined();

      // use double type as it's non-null
      const parentOwnerField = getField(familyMemberType!, 'parent');
      expect(parentOwnerField).toBeDefined();

      const childOwnerField = getField(familyMemberType!, 'child');
      expect(childOwnerField).toBeDefined();

      /* eslint-disable @typescript-eslint/no-explicit-any */
      expect((parentOwnerField as any).type.type.name.value).toEqual('ID');
      expect((childOwnerField as any).type.type.name.value).toEqual('ID');
      /* eslint-enable */

      expect(out.resolvers['Query.listFamilyMembers.auth.1.req.vtl']).toMatchSnapshot();
    });

    test('@auth on relational schema with LSI and GSI', () => {
      const inputSchema = `
        type User @model
          @auth(rules: [
            {allow: owner, ownerField: "sub", identityClaim: "sub"}
          ]) {
            sub: String! @primaryKey
            following: [Follow]! @hasMany(indexName: "byFollower", fields: ["sub"])
            followers: [Follow]! @hasMany(indexName: "byFollowed", fields: ["sub"])
        }

        type Follow
          @model
          @auth(rules: [
            {allow: owner, ownerField: "ownerSub", identityClaim: "sub"}
          ]) {
          ownerSub: String!
            @primaryKey(sortKeyFields: ["followed_sub"])
            @index(name: "byFollower", sortKeyFields: ["createdAt"])

          followed_sub: String! @index(name: "byFollowed", sortKeyFields: ["createdAt"])
          createdAt: AWSDateTime!
        }
      `;

      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };

      const out = testTransform({
        schema: inputSchema,
        authConfig,
        transformParameters: {
          secondaryKeyAsGSI: false,
          useSubUsernameForDefaultIdentityClaim: false,
        },
        transformers: [
          new ModelTransformer(),
          new HasManyTransformer(),
          new IndexTransformer(),
          new PrimaryKeyTransformer(),
          new AuthTransformer(),
        ],
      });

      expect(out).toBeDefined();
      const schema = parse(out.schema);
      validateModelSchema(schema);
    });

    test('@auth on schema with LSI and GSI', () => {
      const inputSchema = `
        type Model @model @auth(rules: [{allow: public, provider: apiKey}]) {
          user: String! @primaryKey(sortKeyFields: ["channel", "token", "secret"]) @index(name: "byUser", queryField: "listModelsByUser", sortKeyFields: ["channel"])
          channel: String! @index(name: "byChannel", queryField: "listModelsByChannel", sortKeyFields: ["user"])
          token: String!
          secret: String!
        }
      `;

      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'API_KEY',
        },
        additionalAuthenticationProviders: [],
      };

      const out = testTransform({
        schema: inputSchema,
        authConfig,
        transformParameters: {
          secondaryKeyAsGSI: false,
          useSubUsernameForDefaultIdentityClaim: false,
        },
        transformers: [
          new ModelTransformer(),
          new HasManyTransformer(),
          new IndexTransformer(),
          new PrimaryKeyTransformer(),
          new AuthTransformer(),
        ],
      });

      expect(out).toBeDefined();
      const schema = parse(out.schema);
      validateModelSchema(schema);
    });
  });

  describe('sort key fields on @auth owner field', () => {
    let authConfig: AppSyncAuthConfiguration;

    beforeAll(() => {
      authConfig = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
    });

    test('handles sortKeyFields with implicit multi claim and use sub::username default', () => {
      const schema = `
        type Test @model @auth(rules: [{ allow: owner }]) {
          id: ID! @primaryKey(sortKeyFields: "owner")
          owner: String!
        }`;

      expect(() =>
        testTransform({
          schema,
          authConfig,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
        }),
      ).toThrow(
        "The primary key's sort key type 'owner' cannot be used as an owner @auth field too. Please use another field for the sort key.",
      );
    });

    test('handles sortKeyFields with explicit multi claim and explicit identity claim', () => {
      const schema = `
        type Test @model @auth(rules: [{ allow: owner, identityClaim: "sub::username" }]) {
          id: ID! @primaryKey(sortKeyFields: "owner")
          owner: String!
        }`;

      const out = testTransform({
        schema,
        authConfig,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
        transformParameters: {
          useSubUsernameForDefaultIdentityClaim: false,
        },
      });
      expect(out).toBeDefined();
    });

    test('handles sortKeyFields with explicit single claim and explicit identity claim', () => {
      const schema = `
        type Test @model @auth(rules: [{ allow: owner, identityClaim: "username" }]) {
          id: ID! @primaryKey(sortKeyFields: "owner")
          owner: String!
        }`;

      const out = testTransform({
        schema,
        authConfig,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();
    });

    test('handles sortKeyFields with implicit single claim and use username for default', () => {
      const schema = `
        type Test @model @auth(rules: [{ allow: owner }]) {
          id: ID! @primaryKey(sortKeyFields: "owner")
          owner: String!
        }`;

      const out = testTransform({
        schema,
        authConfig,
        transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
        transformParameters: {
          useSubUsernameForDefaultIdentityClaim: false,
        },
      });
      expect(out).toBeDefined();
    });

    test('handles sortKeyFields with implicit single claim, custom owner field, and use sub::username for default', () => {
      const schema = `
        type Test @model @auth(rules: [{ allow: owner, ownerField: "myOwnerField" }]) {
          id: ID! @primaryKey(sortKeyFields: "myOwnerField")
          myOwnerField: String!
        }`;

      expect(() =>
        testTransform({
          schema,
          authConfig,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
        }),
      ).toThrow(
        "The primary key's sort key type 'myOwnerField' cannot be used as an owner @auth field too. Please use another field for the sort key.",
      );
    });

    describe('owner field as part of global secondary index', () => {
      test('handles ownerfield as part of sortKeyFields of GSI with default identity claim', () => {
        const schema = `
          type Note @model @auth(rules: [{ allow: owner }]) 
          {  
            noteId: String! @primaryKey
            noteType: String! @index(name: "byNoteType", queryField: "notesByNoteTypeAndOwner", sortKeyFields:["owner"])  
            content: String
            owner: String
          }
        `;

        const out = testTransform({
          schema,
          authConfig,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer(), new IndexTransformer()],
        });

        expect(out.resolvers['Query.notesByNoteTypeAndOwner.auth.1.req.vtl']).toMatchSnapshot();
      });
      test('handles ownerfield as part of sortKeyFields of GSI with username identity claim', () => {
        const schema = `
          type Note @model @auth(rules: [{ allow: owner, identityClaim: "username" }]) 
          {  
            noteId: String! @primaryKey
            noteType: String! @index(name: "byNoteType", queryField: "notesByNoteTypeAndOwner", sortKeyFields:["owner"])  
            content: String
            owner: String
          }
        `;

        const out = testTransform({
          schema,
          authConfig,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer(), new IndexTransformer()],
        });
        expect(out.resolvers['Query.notesByNoteTypeAndOwner.auth.1.req.vtl']).toMatchSnapshot();
      });
      test('handles ownerfield as GSI field with default identity claim', () => {
        const schema = `
          type Note @model @auth(rules: [{ allow: owner }]) 
          {  
            noteId: String! @primaryKey
            noteType: String!
            content: String
            owner: String! @index(name: "byOwner", queryField: "notesByOwner") 
          }
        `;

        const out = testTransform({
          schema,
          authConfig,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer(), new IndexTransformer()],
        });
        expect(out.resolvers['Query.notesByOwner.auth.1.req.vtl']).toMatchSnapshot();
      });
      test('handles ownerfield as GSI field with username identity claim', () => {
        const schema = `
          type Note @model @auth(rules: [{ allow: owner, identityClaim: "username" }]) 
          {  
            noteId: String! @primaryKey
            noteType: String!
            content: String
            owner: String! @index(name: "byOwner", queryField: "notesByOwner") 
          }
        `;

        const out = testTransform({
          schema,
          authConfig,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer(), new IndexTransformer()],
        });
        expect(out.resolvers['Query.notesByOwner.auth.1.req.vtl']).toMatchSnapshot();
      });
    });
  });

  describe('with populateOwnerFieldForStaticGroupAuth feature flag disabled', () => {
    test('auth transformer validation happy case', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner}]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
        transformParameters: {
          populateOwnerFieldForStaticGroupAuth: false,
        },
      });
      expect(out).toBeDefined();
      const resources = out.rootStack.Resources;
      expect(resources).toBeDefined();
      expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual(
        'AMAZON_COGNITO_USER_POOLS',
      );
    });

    test('owner field is not set where the field is a list', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, ownerField: "editors" }]) {
          id: ID!
          title: String!
          editors: [String]
          createdAt: String
          updatedAt: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
        transformParameters: {
          populateOwnerFieldForStaticGroupAuth: false,
        },
      });
      expect(out).toBeDefined();
      const resources = out.rootStack.Resources;
      expect(resources).toBeDefined();
      expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual(
        'AMAZON_COGNITO_USER_POOLS',
      );
      expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
    });

    test('owner field is not set where field is "::" delimited string', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, identityClaim: "sub::username" }]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
        transformParameters: {
          populateOwnerFieldForStaticGroupAuth: false,
        },
      });
      expect(out).toBeDefined();
      const resources = out.rootStack.Resources;
      expect(resources).toBeDefined();
      expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual(
        'AMAZON_COGNITO_USER_POOLS',
      );
      expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
    });

    test('owner field is not set after static auth checks', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner}, { allow: groups, groups: ["Admin"] }]) {
          id: ID!
          title: String!
          createdAt: String
          updatedAt: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
        transformParameters: {
          populateOwnerFieldForStaticGroupAuth: false,
        },
      });
      expect(out).toBeDefined();
      const resources = out.rootStack.Resources;
      expect(resources).toBeDefined();
      expect(resources![ResourceConstants.RESOURCES.GraphQLAPILogicalID].Properties.AuthenticationType).toEqual(
        'AMAZON_COGNITO_USER_POOLS',
      );
      expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toMatchSnapshot();
    });
  });

  describe('owner with groups (AND logic - owner.inGroup())', () => {
    test('owner with groups generates VTL with group membership check', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, groups: ["Admin", "Moderator"]}]) {
          id: ID!
          title: String!
          owner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // Verify VTL contains group membership check for create (auth logic in req.vtl)
      const createVtl = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
      expect(createVtl).toContain('isInRequiredGroup');
      expect(createVtl).toContain('cognito:groups');
      expect(createVtl).toMatchSnapshot();

      // Verify VTL contains group membership check for update (auth logic in res.vtl after fetching record)
      const updateVtl = out.resolvers['Mutation.updatePost.auth.1.res.vtl'];
      expect(updateVtl).toContain('isInRequiredGroup');
      expect(updateVtl).toMatchSnapshot();

      // Verify VTL contains group membership check for delete (auth logic in res.vtl after fetching record)
      const deleteVtl = out.resolvers['Mutation.deletePost.auth.1.res.vtl'];
      expect(deleteVtl).toContain('isInRequiredGroup');
      expect(deleteVtl).toMatchSnapshot();

      // Verify VTL contains group membership check for queries (auth logic in req.vtl)
      const getVtl = out.resolvers['Query.getPost.auth.1.req.vtl'];
      expect(getVtl).toContain('isInRequiredGroup');
      expect(getVtl).toMatchSnapshot();

      const listVtl = out.resolvers['Query.listPosts.auth.1.req.vtl'];
      expect(listVtl).toContain('isInRequiredGroup');
      expect(listVtl).toMatchSnapshot();
    });

    test('owner with groups for specific operations', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, groups: ["Admin"], operations: [create, update]}]) {
          id: ID!
          title: String!
          owner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // Create should have group check (auth logic in req.vtl)
      const createVtl = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
      expect(createVtl).toContain('isInRequiredGroup');
      expect(createVtl).toMatchSnapshot();

      // Update should have group check (auth logic in res.vtl after fetching record)
      const updateVtl = out.resolvers['Mutation.updatePost.auth.1.res.vtl'];
      expect(updateVtl).toContain('isInRequiredGroup');
      expect(updateVtl).toMatchSnapshot();
    });

    test('owner with groups for read operations (expanded from read alias)', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, groups: ["Readers"], operations: [read]}]) {
          id: ID!
          title: String!
          owner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // Get and list should have group check (read expands to get, list, listen, search, sync)
      const getVtl = out.resolvers['Query.getPost.auth.1.req.vtl'];
      expect(getVtl).toContain('isInRequiredGroup');
      expect(getVtl).toMatchSnapshot();

      const listVtl = out.resolvers['Query.listPosts.auth.1.req.vtl'];
      expect(listVtl).toContain('isInRequiredGroup');
      expect(listVtl).toMatchSnapshot();
    });

    test('owner with groups throws error for SQL data sources', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, groups: ["Admin"]}]) {
          id: ID! @primaryKey
          title: String!
          owner: String
        }`;
      expect(() =>
        testTransform({
          schema: validSchema,
          authConfig,
          transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new AuthTransformer()],
          dataSourceStrategies: constructDataSourceStrategies(validSchema, mockSqlDataSourceStrategy()),
        }),
      ).toThrow("cannot use owner-based auth with 'groups' (AND logic) as it is not supported for SQL data sources");
    });

    test('owner with groups in subscriptions', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, groups: ["Subscribers"], operations: [create, listen]}]) {
          id: ID!
          title: String!
          owner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // Subscription should have group check
      const onCreateVtl = out.resolvers['Subscription.onCreatePost.auth.1.req.vtl'];
      expect(onCreateVtl).toContain('isInRequiredGroup');
      expect(onCreateVtl).toMatchSnapshot();
    });

    test('owner with different groups for different operations', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      // Readers group can read, Writers group can create/update, Admins can delete
      const validSchema = `
        type Post @model @auth(rules: [
          {allow: owner, groups: ["Readers"], operations: [read]},
          {allow: owner, groups: ["Writers"], operations: [create, update]},
          {allow: owner, groups: ["Admins"], operations: [delete]}
        ]) {
          id: ID!
          title: String!
          owner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // Create should check for Writers group
      const createVtl = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
      expect(createVtl).toContain('Writers');
      expect(createVtl).toMatchSnapshot();

      // Update should check for Writers group
      const updateVtl = out.resolvers['Mutation.updatePost.auth.1.res.vtl'];
      expect(updateVtl).toContain('Writers');
      expect(updateVtl).toMatchSnapshot();

      // Delete should check for Admins group
      const deleteVtl = out.resolvers['Mutation.deletePost.auth.1.res.vtl'];
      expect(deleteVtl).toContain('Admins');
      expect(deleteVtl).toMatchSnapshot();

      // Get should check for Readers group
      const getVtl = out.resolvers['Query.getPost.auth.1.req.vtl'];
      expect(getVtl).toContain('Readers');
      expect(getVtl).toMatchSnapshot();

      // List should check for Readers group
      const listVtl = out.resolvers['Query.listPosts.auth.1.req.vtl'];
      expect(listVtl).toContain('Readers');
      expect(listVtl).toMatchSnapshot();
    });

    test('owner.inGroup combined with regular groups rule (OR logic between rules)', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      // Owner must be in "Premium" group, OR anyone in "Admin" group can access
      const validSchema = `
        type Post @model @auth(rules: [
          {allow: owner, groups: ["Premium"]},
          {allow: groups, groups: ["Admin"]}
        ]) {
          id: ID!
          title: String!
          owner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // Should have both owner+group check (AND) and static group check (OR between rules)
      const createVtl = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
      expect(createVtl).toContain('Premium'); // owner.inGroup check
      expect(createVtl).toContain('Admin'); // static group check
      expect(createVtl).toMatchSnapshot();

      const getVtl = out.resolvers['Query.getPost.auth.1.req.vtl'];
      expect(getVtl).toContain('Premium');
      expect(getVtl).toContain('Admin');
      expect(getVtl).toMatchSnapshot();
    });

    test('owner.inGroup with OIDC provider', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'OPENID_CONNECT',
          openIDConnectConfig: {
            name: 'myOIDC',
            issuerUrl: 'https://example.com',
          },
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, groups: ["Admin"], provider: oidc}]) {
          id: ID!
          title: String!
          owner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      const createVtl = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
      expect(createVtl).toContain('isInRequiredGroup');
      expect(createVtl).toContain('Open ID Connect Authorization'); // Should check for OIDC auth type
      expect(createVtl).toMatchSnapshot();
    });

    test('owner.inGroup with custom ownerField', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      const validSchema = `
        type Post @model @auth(rules: [{allow: owner, ownerField: "author", groups: ["Writers"]}]) {
          id: ID!
          title: String!
          author: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      const createVtl = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
      expect(createVtl).toContain('isInRequiredGroup');
      expect(createVtl).toContain('author'); // Should use custom owner field
      expect(createVtl).toMatchSnapshot();
    });

    test('owner.inGroup combined with public API key access', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [{ authenticationType: 'API_KEY' }],
      };
      // API key can read, but mutations require owner in group
      const validSchema = `
        type Post @model @auth(rules: [
          {allow: public, provider: apiKey, operations: [read]},
          {allow: owner, groups: ["Writers"], operations: [create, update, delete]}
        ]) {
          id: ID!
          title: String!
          owner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // Create should have owner.inGroup check
      const createVtl = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
      expect(createVtl).toContain('isInRequiredGroup');
      expect(createVtl).toContain('Writers');
      expect(createVtl).toMatchSnapshot();

      // Get should allow API key (no group check for API key)
      const getVtl = out.resolvers['Query.getPost.auth.1.req.vtl'];
      expect(getVtl).toContain('API Key');
      expect(getVtl).toMatchSnapshot();
    });

    test('multiple owner.inGroup rules with same operation accumulate groups', () => {
      const authConfig: AppSyncAuthConfiguration = {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      };
      // Both rules apply to create - groups should be accumulated
      const validSchema = `
        type Post @model @auth(rules: [
          {allow: owner, groups: ["GroupA"], operations: [create]},
          {allow: owner, groups: ["GroupB"], operations: [create]}
        ]) {
          id: ID!
          title: String!
          owner: String
        }`;
      const out = testTransform({
        schema: validSchema,
        authConfig,
        transformers: [new ModelTransformer(), new AuthTransformer()],
      });
      expect(out).toBeDefined();

      // Create should check for both GroupA and GroupB
      const createVtl = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
      expect(createVtl).toContain('GroupA');
      expect(createVtl).toContain('GroupB');
      expect(createVtl).toMatchSnapshot();
    });
  });
});

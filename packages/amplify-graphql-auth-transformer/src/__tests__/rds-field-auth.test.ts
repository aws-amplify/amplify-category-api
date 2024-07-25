import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { constructDataSourceStrategies, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { parse } from 'graphql';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { BelongsToTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { AuthTransformer } from '../graphql-auth-transformer';

describe('Verify RDS Model level Auth rules on queries:', () => {
  const mysqlStrategy = mockSqlDataSourceStrategy();

  it('should successfully transform different field auth rules', async () => {
    const validSchema = `
        type Post @model @auth(rules: [{ allow: private }]) {
            id: ID! @primaryKey @auth(rules: [{ allow: private }, { allow: public }])
            owner: String
            authors: [String]
            privateContent: String @auth(rules: [{ allow: private }])
            publicContent: String @auth(rules: [{ allow: public }])
            ownerContent: String @auth(rules: [{ allow: owner, operations: [create, read], identityClaim: "user_id" }])
            ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [update, read] }])
        }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        userPoolConfig: {
          userPoolId: 'TEST_USER_POOL_ID',
        },
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'API_KEY',
        },
      ],
    };

    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer(), new AuthTransformer(), new PrimaryKeyTransformer()],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      authConfig,
      synthParameters: {
        identityPoolId: 'TEST_IDENTITY_POOL_ID',
      },
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    // Verify the field auth resolver slots
    expect(out.resolvers['Post.authors.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post.authors.res.vtl']).toMatchSnapshot();

    expect(out.resolvers['Post.owner.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post.owner.res.vtl']).toMatchSnapshot();

    expect(out.resolvers['Post.ownerContent.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post.ownerContent.res.vtl']).toMatchSnapshot();

    expect(out.resolvers['Post.ownersContent.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post.ownersContent.res.vtl']).toMatchSnapshot();

    expect(out.resolvers['Post.privateContent.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post.privateContent.res.vtl']).toMatchSnapshot();

    expect(out.resolvers['Post.publicContent.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post.publicContent.res.vtl']).toMatchSnapshot();
  });

  it('related models with same groups auth field name but different type should transform correctly', async () => {
    const validSchema = `
      type User 
        @model 
        @auth(rules: [
          { allow: groups, groups: ["Admin"] },
          { allow: public, operations: [get] },
          { allow: groups, groups: ["Dev"], operations: [read] }
          { allow: groups, groupsField: "groupsField", operations: [update, delete] }
        ])
      {
        id: String! @primaryKey
        name: String
        groupsField: String
        profile: Profile @hasOne(references: ["userId"])
      }
      type Profile 
        @model 
        @auth(rules: [
          { allow: groups, groups: ["Admin"] },
          { allow: public, operations: [list] },
          { allow: groups, groups: ["Dev"], operations: [get, create, update, delete] }, 
          { allow: groups, groupsField: "groupsField", operations: [read, create] }
        ])
      {
        id: String! @primaryKey
        details: String
        groupsField: [String]
        userId: String!
        user: User @belongsTo(references: ["userId"])
      }
    `;

    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        userPoolConfig: {
          userPoolId: 'TEST_USER_POOL_ID',
        },
      },
      additionalAuthenticationProviders: [
        {
          authenticationType: 'API_KEY',
        },
      ],
    };

    const out = testTransform({
      schema: validSchema,
      transformers: [
        new ModelTransformer(),
        new AuthTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new BelongsToTransformer(),
      ],
      dataSourceStrategies: constructDataSourceStrategies(validSchema, mysqlStrategy),
      authConfig,
      synthParameters: {
        identityPoolId: 'TEST_IDENTITY_POOL_ID',
      },
    });
    expect(out).toBeDefined();

    validateModelSchema(parse(out.schema));
    parse(out.schema);

    // groups field must be of type `string` in the generated `User` resolvers
    expect(out.resolvers['Mutation.updateUser.auth.1.res.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.updateUser.auth.1.res.vtl']).toEqual(expect.stringContaining('"groupsFieldType": "string"'));

    expect(out.resolvers['Mutation.deleteUser.auth.1.res.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.deleteUser.auth.1.res.vtl']).toEqual(expect.stringContaining('"groupsFieldType": "string"'));

    // groups field must be of type `string[]` in the generated `Profile` resolvers
    expect(out.resolvers['Mutation.createProfile.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Mutation.createProfile.auth.1.req.vtl']).toEqual(expect.stringContaining('"groupsFieldType": "string[]"'));

    expect(out.resolvers['Query.listProfiles.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.listProfiles.auth.1.req.vtl']).toEqual(expect.stringContaining('"groupsFieldType": "string[]"'));

    expect(out.resolvers['Query.getProfile.auth.1.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.getProfile.auth.1.req.vtl']).toEqual(expect.stringContaining('"groupsFieldType": "string[]"'));
  });
});

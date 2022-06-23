import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { GraphQLTransform } from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration, FeatureFlagProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '../graphql-auth-transformer';

const featureFlags: FeatureFlagProvider = {
  getBoolean: (value: string): boolean => {
    if (value === 'useFieldNameForPrimaryKeyConnectionField') {
      return true;
    }
    return false;
  },
  getString: jest.fn(),
  getNumber: jest.fn(),
  getObject: jest.fn(),
};

describe('@auth with custom primary keys', () => {
  it('generates correct allowed fields', () => {
    const authConfig: AppSyncAuthConfiguration = {
      defaultAuthentication: {
        authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      },
      additionalAuthenticationProviders: [],
    };
    const validSchema = `
      type PostMetadata @model @auth(rules: [{allow: owner}]) {
        postMetadataReference: ID! @primaryKey
        title: String!
        post: Post @belongsTo
      }

      type Post @model @auth(rules: [{allow: owner}]) {
        postReference: ID! @primaryKey
        title: String!
        comments: [Comment] @hasMany
        metadata: PostMetadata @hasOne
      }

      type Comment @model @auth(rules: [{allow: owner}]) {
        commentReference: ID! @primaryKey
        title: String!
      }
    `;

    const transformer = new GraphQLTransform({
      authConfig,
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
        new AuthTransformer(),
      ],
      featureFlags,
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();

    expect(out.resolvers['Mutation.createPostMetadata.auth.1.req.vtl']).toContain('#set( $ownerAllowedFields0 = ["postMetadataReference","title","post","postMetadataPostPostReference"] )');
    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toContain('#set( $ownerAllowedFields0 = ["postReference","title","comments","metadata","postMetadataPostMetadataReference"] )');
    expect(out.resolvers['Mutation.createComment.auth.1.req.vtl']).toContain('#set( $ownerAllowedFields0 = ["commentReference","title","postCommentsPostReference"] )');
  });
});

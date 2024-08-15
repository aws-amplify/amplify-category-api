import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthTransformer } from '../graphql-auth-transformer';

describe('@auth with custom primary keys', () => {
  xit('generates correct allowed fields', () => {
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

    const out = testTransform({
      schema: validSchema,
      authConfig,
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
        new AuthTransformer(),
      ],
    });
    expect(out).toBeDefined();

    expect(out.resolvers['Mutation.createPostMetadata.auth.1.req.vtl']).toContain(
      '#set( $ownerAllowedFields0 = ["postMetadataReference","title","post","postMetadataPostPostReference"] )',
    );
    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toContain(
      '#set( $ownerAllowedFields0 = ["postReference","title","comments","metadata","postMetadataPostMetadataReference"] )',
    );
    expect(out.resolvers['Mutation.createComment.auth.1.req.vtl']).toContain(
      '#set( $ownerAllowedFields0 = ["commentReference","title","postCommentsPostReference"] )',
    );
  });
});

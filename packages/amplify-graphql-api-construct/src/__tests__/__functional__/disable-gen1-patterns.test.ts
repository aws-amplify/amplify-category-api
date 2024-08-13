import * as cdk from 'aws-cdk-lib';
import { Annotations } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

/**
 * Utility to test if schema is valid when gen 1 patterns are disabled
 * @param schema schema to test
 * @param allowGen1Patterns if gen 1 patterns are allowed.
 */
const verifySchema = (schema: string): cdk.Stack => {
  const stack = new cdk.Stack();
  new AmplifyGraphqlApi(stack, 'TestApi', {
    definition: AmplifyGraphqlDefinition.fromString(schema),
    authorizationModes: {
      apiKeyConfig: { expires: cdk.Duration.days(7) },
    },
  });

  return stack;
};

describe('Deprecate Gen 1 patterns', () => {
  test('does not allow @manyToMany', () => {
    const stack = verifySchema(/* GraphQL */ `
      type Post @model {
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }

      type Tag @model {
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `);
    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      '@manyToMany is deprecated. This functionality will be removed in the next major release.',
    );
  });

  test('does not allow @searchable', () => {
    const stack = verifySchema(/* GraphQL */ `
      type Post @model @searchable {
        title: String
      }
    `);

    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      '@searchable is deprecated. This functionality will be removed in the next major release.',
    );
  });

  test('does not allow @predictions', () => {
    const schema = /* GraphQL */ `
      type Query {
        recognizeLabelsFromImage: [String] @predictions(actions: [identifyLabels])
      }
    `;
    const stack = new cdk.Stack();
    new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(schema),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
      predictionsBucket: new Bucket(stack, 'myfakebucket'),
    });
    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      '@predictions is deprecated. This functionality will be removed in the next major release.',
    );
  });

  test('does not allow fields on @belongsTo', () => {
    const stack = verifySchema(/* GraphQL */ `
      type Post @model {
        authorID: ID
        author: Author @belongsTo(fields: ["authorID"])
      }

      type Author @model {
        posts: [Post] @hasMany
      }
    `);
    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      'fields argument on @belongsTo is deprecated. Modify Post.author to use references instead. This functionality will be removed in the next major release.',
    );
  });

  test('does not allow fields on @hasMany', () => {
    const stack = verifySchema(/* GraphQL */ `
      type Post @model {
        author: Author @belongsTo
      }

      type Author @model {
        postID: ID
        posts: [Post] @hasMany(fields: ["postID"])
      }
    `);
    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      'fields argument on @hasMany is deprecated. Modify Author.posts to use references instead. This functionality will be removed in the next major release.',
    );
  });

  test('does not allow fields on @hasOne', () => {
    const stack = verifySchema(/* GraphQL */ `
      type Profile @model {
        author: Author @belongsTo
      }

      type Author @model {
        profileID: ID
        profile: Profile @hasOne(fields: ["profileID"])
      }
    `);
    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      'fields argument on @hasOne is deprecated. Modify Author.profile to use references instead. This functionality will be removed in the next major release.',
    );
  });

  test('does not allow required @belongsTo fields', () => {
    const stack = verifySchema(/* GraphQL */ `
      type Post @model {
        author: Author! @belongsTo
      }

      type Author @model {
        posts: [Post] @hasMany
      }
    `);
    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      'fields argument on @belongsTo is deprecated. Modify Post.author to use references instead. This functionality will be removed in the next major release.',
    );
  });

  test('does not allow required @hasMany fields', () => {
    const stack = verifySchema(/* GraphQL */ `
      type Post @model {
        author: Author @belongsTo
      }

      type Author @model {
        posts: [Post]! @hasMany
      }
    `);
    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      '@hasMany on required fields is deprecated. Modify Author.posts to be optional. This functionality will be removed in the next major release.',
    );
  });

  test('does not allow required @hasOne fields', () => {
    const stack = verifySchema(/* GraphQL */ `
      type Profile @model {
        author: Author @belongsTo
      }

      type Author @model {
        profile: Profile! @hasOne
      }
    `);
    Annotations.fromStack(stack).hasWarning(
      '/Default/TestApi/GraphQLAPI',
      '@hasOne on required fields is deprecated. Modify Author.profile to be optional. This functionality will be removed in the next major release.',
    );
  });
});

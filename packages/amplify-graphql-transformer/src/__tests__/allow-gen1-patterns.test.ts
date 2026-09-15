import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { Stack } from 'aws-cdk-lib';
import { Match, Annotations } from 'aws-cdk-lib/assertions';
import { constructTransformerChain } from '..';

const verifySchema = (schema: string, allowGen1Patterns: boolean): Stack => {
  const out = testTransform({
    schema,
    transformers: constructTransformerChain({ storageConfig: { bucketName: 'myfakebucket' } }),
    transformParameters: {
      allowGen1Patterns,
    },
  });

  return out.rawRootStack;
};
describe('gen 1 patterns', () => {
  describe('allow', () => {
    test('allows @manyToMany', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            tags: [Tag] @manyToMany(relationName: "PostTags")
          }

          type Tag @model {
            posts: [Post] @manyToMany(relationName: "PostTags")
          }
        `,
        true,
      );
      Annotations.fromStack(stack).hasNoWarning('/transformer-root-stack/GraphQLAPI', Match.anyValue());
    });

    test('allows @searchable', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model @searchable {
            title: String
          }
        `,
        true,
      );
      Annotations.fromStack(stack).hasNoWarning('/transformer-root-stack/GraphQLAPI', Match.anyValue());
    });

    test('allows @predictions', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Query {
            recognizeLabelsFromImage: [String] @predictions(actions: [identifyLabels])
          }
        `,
        true,
      );
      Annotations.fromStack(stack).hasNoWarning('/transformer-root-stack/GraphQLAPI', Match.anyValue());
    });

    test('allows fields on @belongsTo', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            authorID: ID
            author: Author @belongsTo(fields: ["authorID"])
          }

          type Author @model {
            posts: [Post] @hasMany
          }
        `,
        true,
      );
      Annotations.fromStack(stack).hasNoWarning('/transformer-root-stack/GraphQLAPI', Match.anyValue());
    });

    test('allows fields on @hasMany', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            author: Author @belongsTo
          }

          type Author @model {
            postID: ID
            posts: [Post] @hasMany(fields: ["postID"])
          }
        `,
        true,
      );
      Annotations.fromStack(stack).hasNoWarning('/transformer-root-stack/GraphQLAPI', Match.anyValue());
    });

    test('allows fields on @hasOne', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Profile @model {
            author: Author @belongsTo
          }

          type Author @model {
            profileID: ID
            profile: Profile @hasOne(fields: ["profileID"])
          }
        `,
        true,
      );
      Annotations.fromStack(stack).hasNoWarning('/transformer-root-stack/GraphQLAPI', Match.anyValue());
    });

    test('allows required @belongsTo fields', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            author: Author! @belongsTo
          }

          type Author @model {
            posts: [Post] @hasMany
          }
        `,
        true,
      );
      Annotations.fromStack(stack).hasNoWarning('/transformer-root-stack/GraphQLAPI', Match.anyValue());
    });

    test('allows required @hasMany fields', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            author: Author @belongsTo
          }

          type Author @model {
            posts: [Post]! @hasMany
          }
        `,
        true,
      );
      Annotations.fromStack(stack).hasNoWarning('/transformer-root-stack/GraphQLAPI', Match.anyValue());
    });

    test('allows required @hasOne fields', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Profile @model {
            author: Author @belongsTo
          }

          type Author @model {
            profile: Profile! @hasOne
          }
        `,
        true,
      );
      Annotations.fromStack(stack).hasNoWarning('/transformer-root-stack/GraphQLAPI', Match.anyValue());
    });
  });
  describe('disallow', () => {
    test('does not allow @manyToMany', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            tags: [Tag] @manyToMany(relationName: "PostTags")
          }

          type Tag @model {
            posts: [Post] @manyToMany(relationName: "PostTags")
          }
        `,
        false,
      );
      Annotations.fromStack(stack).hasWarning(
        '/transformer-root-stack/GraphQLAPI',
        '@manyToMany is deprecated. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow @searchable', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model @searchable {
            title: String
          }
        `,
        false,
      );

      Annotations.fromStack(stack).hasWarning(
        '/transformer-root-stack/GraphQLAPI',
        '@searchable is deprecated. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow @predictions', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Query {
            recognizeLabelsFromImage: [String] @predictions(actions: [identifyLabels])
          }
        `,
        false,
      );
      Annotations.fromStack(stack).hasWarning(
        '/transformer-root-stack/GraphQLAPI',
        '@predictions is deprecated. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow fields on @belongsTo', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            authorID: ID
            author: Author @belongsTo(fields: ["authorID"])
          }

          type Author @model {
            posts: [Post] @hasMany
          }
        `,
        false,
      );
      Annotations.fromStack(stack).hasWarning(
        '/transformer-root-stack/GraphQLAPI',
        'fields argument on @belongsTo is deprecated. Modify Post.author to use references instead. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow fields on @hasMany', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            author: Author @belongsTo
          }

          type Author @model {
            postID: ID
            posts: [Post] @hasMany(fields: ["postID"])
          }
        `,
        false,
      );
      Annotations.fromStack(stack).hasWarning(
        '/transformer-root-stack/GraphQLAPI',
        'fields argument on @hasMany is deprecated. Modify Author.posts to use references instead. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow fields on @hasOne', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Profile @model {
            author: Author @belongsTo
          }

          type Author @model {
            profileID: ID
            profile: Profile @hasOne(fields: ["profileID"])
          }
        `,
        false,
      );
      Annotations.fromStack(stack).hasWarning(
        '/transformer-root-stack/GraphQLAPI',
        'fields argument on @hasOne is deprecated. Modify Author.profile to use references instead. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow required @belongsTo fields', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            author: Author! @belongsTo
          }

          type Author @model {
            posts: [Post] @hasMany
          }
        `,
        false,
      );
      Annotations.fromStack(stack).hasWarning(
        '/transformer-root-stack/GraphQLAPI',
        'fields argument on @belongsTo is deprecated. Modify Post.author to use references instead. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow required @hasMany fields', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Post @model {
            author: Author @belongsTo
          }

          type Author @model {
            posts: [Post]! @hasMany
          }
        `,
        false,
      );
      Annotations.fromStack(stack).hasWarning(
        '/transformer-root-stack/GraphQLAPI',
        '@hasMany on required fields is deprecated. Modify Author.posts to be optional. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow required @hasOne fields', () => {
      const stack = verifySchema(
        /* GraphQL */ `
          type Profile @model {
            author: Author @belongsTo
          }

          type Author @model {
            profile: Profile! @hasOne
          }
        `,
        false,
      );
      Annotations.fromStack(stack).hasWarning(
        '/transformer-root-stack/GraphQLAPI',
        '@hasOne on required fields is deprecated. Modify Author.profile to be optional. This functionality will be removed in the next major release.',
      );
    });
  });
});

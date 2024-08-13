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
const verifySchema = (schema: string, allowGen1Patterns: boolean): cdk.Stack => {
  const stack = new cdk.Stack();
  new AmplifyGraphqlApi(stack, 'TestApi', {
    definition: AmplifyGraphqlDefinition.fromString(schema),
    authorizationModes: {
      apiKeyConfig: { expires: cdk.Duration.days(7) },
    },
    translationBehavior: {
      _allowGen1Patterns: allowGen1Patterns,
    },
  });

  return stack;
};

describe('_allowGen1Patterns', () => {
  test('defaults to allow', () => {
    const schema = `
      type Post @model {
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }

      type Tag @model {
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `;
    const stack = new cdk.Stack();
    expect(
      () =>
        new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(schema),
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        }),
    ).not.toThrow();
  });

  describe('_allowGen1Patterns: true', () => {
    test('allows @manyToMany', () => {
      expect(() =>
        verifySchema(
          `
            type Post @model {
              tags: [Tag] @manyToMany(relationName: "PostTags")
            }

            type Tag @model {
              posts: [Post] @manyToMany(relationName: "PostTags")
            }
          `,
          true,
        ),
      ).not.toThrow();
    });

    test('allows @searchable', () => {
      expect(() =>
        verifySchema(
          `
            type Post @model @searchable {
              title: String
            }
          `,
          true,
        ),
      ).not.toThrow();
    });

    test('allows @predictions', () => {
      const schema = `
        type Query {
          recognizeLabelsFromImage: [String] @predictions(actions: [identifyLabels])
        }
      `;
      const stack = new cdk.Stack();
      expect(
        () =>
          new AmplifyGraphqlApi(stack, 'TestApi', {
            definition: AmplifyGraphqlDefinition.fromString(schema),
            authorizationModes: {
              apiKeyConfig: { expires: cdk.Duration.days(7) },
            },
            translationBehavior: {
              _allowGen1Patterns: true,
            },
            predictionsBucket: new Bucket(stack, 'myfakebucket'),
          }),
      ).not.toThrow();
    });

    test('allows fields on @belongsTo', () => {
      expect(() =>
        verifySchema(
          `
            type Post @model {
              authorID: ID
              author: Author @belongsTo(fields: ["authorID"])
            }

            type Author @model {
              posts: [Post] @hasMany
            }
          `,
          true,
        ),
      ).not.toThrow();
    });

    test('allows fields on @hasMany', () => {
      expect(() =>
        verifySchema(
          `
            type Post @model {
              author: Author @belongsTo
            }

            type Author @model {
              postID: ID
              posts: [Post] @hasMany(fields: ["postID"])
            }
          `,
          true,
        ),
      ).not.toThrow();
    });

    test('allows fields on @hasOne', () => {
      expect(() =>
        verifySchema(
          `
            type Profile @model {
              author: Author @belongsTo
            }

            type Author @model {
              profileID: ID
              profile: Profile @hasOne(fields: ["profileID"])
            }
          `,
          true,
        ),
      ).not.toThrow();
    });

    test('allows required @belongsTo fields', () => {
      expect(() =>
        verifySchema(
          `
            type Post @model {
              author: Author! @belongsTo
            }

            type Author @model {
              posts: [Post] @hasMany
            }
          `,
          true,
        ),
      ).not.toThrow();
    });

    test('allows required @hasMany fields', () => {
      expect(() =>
        verifySchema(
          `
            type Post @model {
              author: Author @belongsTo
            }

            type Author @model {
              posts: [Post]! @hasMany
            }
          `,
          true,
        ),
      ).not.toThrow();
    });

    test('allows required @hasOne fields', () => {
      expect(() =>
        verifySchema(
          `
            type Profile @model {
              author: Author @belongsTo
            }

            type Author @model {
              profile: Profile! @hasOne
            }
          `,
          true,
        ),
      ).not.toThrow();
    });
  });

  describe('_allowGen1Patterns: false', () => {
    test('does not allow @manyToMany', () => {
      expect(() =>
        verifySchema(
          `
            type Post @model {
              tags: [Tag] @manyToMany(relationName: "PostTags")
            }

            type Tag @model {
              posts: [Post] @manyToMany(relationName: "PostTags")
            }
          `,
          false,
        ),
      ).toThrow('Unknown directive "@manyToMany".');
    });

    test('does not allow @searchable', () => {
      expect(() =>
        verifySchema(
          `
            type Post @model @searchable {
              title: String
            }
          `,
          false,
        ),
      ).toThrow('Unknown directive "@searchable".');
    });

    test('does not allow @predictions', () => {
      expect(() =>
        verifySchema(
          `
            type Query {
              recognizeLabelsFromImage: [String] @predictions(actions: [identifyLabels])
            }
          `,
          false,
        ),
      ).toThrow('Unknown directive "@predictions".');
    });

    test('does not allow fields on @belongsTo', () => {
      const stack = verifySchema(
        `
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
        '/Default/TestApi/GraphQLAPI',
        'fields argument on @belongsTo is deprecated. Modify Post.author to use references instead. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow fields on @hasMany', () => {
      const stack = verifySchema(
        `
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
        '/Default/TestApi/GraphQLAPI',
        'fields argument on @hasMany is deprecated. Modify Author.posts to use references instead. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow fields on @hasOne', () => {
      const stack = verifySchema(
        `
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
        '/Default/TestApi/GraphQLAPI',
        'fields argument on @hasOne is deprecated. Modify Author.profile to use references instead. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow required @belongsTo fields', () => {
      const stack = verifySchema(
        `
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
        '/Default/TestApi/GraphQLAPI',
        'fields argument on @belongsTo is deprecated. Modify Post.author to use references instead. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow required @hasMany fields', () => {
      const stack = verifySchema(
        `
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
        '/Default/TestApi/GraphQLAPI',
        '@hasMany on required fields is deprecated. Modify Author.posts to be optional. This functionality will be removed in the next major release.',
      );
    });

    test('does not allow required @hasOne fields', () => {
      const stack = verifySchema(
        `
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
        '/Default/TestApi/GraphQLAPI',
        '@hasOne on required fields is deprecated. Modify Author.profile to be optional. This functionality will be removed in the next major release.',
      );
    });
  });
});

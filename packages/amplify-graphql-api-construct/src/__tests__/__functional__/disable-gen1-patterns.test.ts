import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

/**
 * Utility to test if schema is valid when gen 1 patterns are disabled
 * @param schema schema to test
 * @param allowGen1Patterns if gen 1 patterns are allowed.
 */
const verifySchema = (schema: string, allowGen1Patterns: boolean): void => {
  const stack = new cdk.Stack();
  new AmplifyGraphqlApi(stack, 'TestApi', {
    definition: AmplifyGraphqlDefinition.fromString(schema),
    authorizationModes: {
      apiKeyConfig: { expires: cdk.Duration.days(7) },
    },
    translationBehavior: {
      allowGen1Patterns,
    },
  });
  Template.fromStack(stack);
};

describe('allowGen1Patterns', () => {
  const schema = `
    type Post @model {
      tags: [Tag] @manyToMany(relationName: "PostTags")
    }

    type Tag @model {
      posts: [Post] @manyToMany(relationName: "PostTags")
    }
  `;

  test('defaults to allow', () => {
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

  test('does not allow fields on @belongsTo', () => {
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
        false,
      ),
    ).toThrow('fields argument on @belongsTo is deprecated. Use references instead.');
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

  test('does not allow fields on @hasMany', () => {
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
        false,
      ),
    ).toThrow('fields argument on @hasMany is deprecated. Use references instead.');
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

  test('does not allow fields on @hasOne', () => {
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
        false,
      ),
    ).toThrow('fields argument on @hasOne is deprecated. Use references instead.');
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

  test('does not allow required @belongsTo fields', () => {
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
        false,
      ),
    ).toThrow('@belongsTo cannot be used on required fields.');
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

  test('does not allow required @hasMany fields', () => {
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
        false,
      ),
    ).toThrow('@hasMany cannot be used on required fields.');
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

  test('does not allow required @hasOne fields', () => {
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
        false,
      ),
    ).toThrow('@hasOne cannot be used on required fields.');
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

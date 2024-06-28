import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

/**
 * Utility to test if schema is valid when gen 1 patterns are disabled
 * @param schema schema to test
 */
const verifySchema = (schema: string): void => {
  const stack = new cdk.Stack();
  new AmplifyGraphqlApi(stack, 'TestApi', {
    definition: AmplifyGraphqlDefinition.fromString(schema),
    authorizationModes: {
      apiKeyConfig: { expires: cdk.Duration.days(7) },
    },
    translationBehavior: {
      allowGen1Patterns: false,
    },
  });
  Template.fromStack(stack);
};

describe('Disallow Gen 1 Patterns', () => {
  test('does not allow @manyToMany', () => {
    expect(() =>
      verifySchema(`
        type Post @model {
          tags: [Tag] @manyToMany
        }

        type Tag @model {
          posts: [Post] @manyToMany
        }
      `),
    ).toThrow('Unknown directive "@manyToMany".');
  });

  test('does not allow fields on @belongsTo', () => {
    expect(() =>
      verifySchema(`
        type Post @model {
          author: Author @belongsTo(fields: [])
        }

        type Author @model {
          posts: [Post] @hasMany
        }
      `),
    ).toThrow('fields argument on @belongsTo is deprecated. Use references instead.');
  });

  test('does not allow fields on @hasMany', () => {
    expect(() =>
      verifySchema(`
        type Post @model {
          author: Author @belongsTo
        }

        type Author @model {
          posts: [Post] @hasMany(fields: [])
        }
      `),
    ).toThrow('fields argument on @hasMany is deprecated. Use references instead.');
  });

  test('does not allow fields on @hasOne', () => {
    expect(() =>
      verifySchema(`
        type Profile @model {
          author: Author @belongsTo
        }

        type Author @model {
          profile: Profile @hasOne(fields: [])
        }
      `),
    ).toThrow('fields argument on @hasOne is deprecated. Use references instead.');
  });

  test('does not allow required @belongsTo fields', () => {
    expect(() =>
      verifySchema(`
        type Post @model {
          author: Author! @belongsTo
        }

        type Author @model {
          posts: [Post] @hasMany
        }
      `),
    ).toThrow('@belongsTo cannot be used on required fields.');
  });

  test('does not allow required @hasMany fields', () => {
    expect(() =>
      verifySchema(`
        type Post @model {
          author: Author @belongsTo
        }

        type Author @model {
          posts: [Post]! @hasMany
        }
      `),
    ).toThrow('@hasMany cannot be used on required fields.');
  });

  test('does not allow required @hasOne fields', () => {
    expect(() =>
      verifySchema(`
        type Profile @model {
          author: Author @belongsTo
        }

        type Author @model {
          profile: Profile! @hasOne
        }
      `),
    ).toThrow('@hasOne cannot be used on required fields.');
  });
});

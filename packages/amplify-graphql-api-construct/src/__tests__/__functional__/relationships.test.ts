import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlSchema } from '../../amplify-graphql-schema';

/**
 * Utility to wrap construct creation a basic synth step to smoke test
 * @param schema schema to synthesize
 */
const verifySchema = (schema: string): void => {
  const stack = new cdk.Stack();
  new AmplifyGraphqlApi(stack, 'TestApi', {
    schema: AmplifyGraphqlSchema.fromString(schema),
    authorizationConfig: {
      apiKeyConfig: { expires: cdk.Duration.days(7) },
    },
  });
  Template.fromStack(stack);
};

describe('relationships', () => {
  it('synths with hasMany w/o belongsTo', () => {
    verifySchema(/* GraphQL */ `
      type Blog @model {
        description: String!
        posts: [Post] @hasMany
      }

      type Post @model {
        description: String!
      }
    `);
  });

  it('synths with hasMany w/ belongsTo', () => {
    verifySchema(/* GraphQL */ `
      type Blog @model {
        description: String!
        posts: [Post] @hasMany
      }

      type Post @model {
        description: String!
        blog: Blog @belongsTo
      }
    `);
  });

  it('synths with hasOne w/o belongsTo', () => {
    verifySchema(/* GraphQL */ `
      type Blog @model {
        description: String!
        posts: Post @hasOne
      }

      type Post @model {
        description: String!
      }
    `);
  });

  it('synths with hasOne w/ belongsTo', () => {
    verifySchema(/* GraphQL */ `
      type Blog @model {
        description: String!
        posts: Post @hasOne
      }

      type Post @model {
        description: String!
        blog: Blog @belongsTo
      }
    `);
  });

  it('synths with manyToMany', () => {
    verifySchema(/* GraphQL */ `
      type Blog @model {
        description: String!
        posts: [Post] @manyToMany(relationName: "blogPosts")
      }

      type Post @model {
        description: String!
        blog: [Blog] @manyToMany(relationName: "blogPosts")
      }
    `);
  });
});

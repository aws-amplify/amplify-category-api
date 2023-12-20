import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, DDB_DEFAULT_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy } from '@aws-amplify/graphql-transformer-test-utils';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

/**
 * Utility to wrap construct creation a basic synth step to smoke test
 * @param schema schema to synthesize
 */
const verifySchema = (schema: string, datasourceStrategy: ModelDataSourceStrategy = DDB_DEFAULT_DATASOURCE_STRATEGY): void => {
  const stack = new cdk.Stack();
  new AmplifyGraphqlApi(stack, 'TestApi', {
    definition: AmplifyGraphqlDefinition.fromString(schema, datasourceStrategy),
    authorizationModes: {
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

  it('synths with manyToMany with default DynamoDB provisioning strategy', () => {
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

  it('synths with manyToMany and AMPLIFY_TABLE strategy', () => {
    verifySchema(
      /* GraphQL */ `
        type Blog @model {
          description: String!
          posts: [Post] @manyToMany(relationName: "blogPosts")
        }

        type Post @model {
          description: String!
          blog: [Blog] @manyToMany(relationName: "blogPosts")
        }
      `,
      DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    );
  });

  it('fails with manyToMany where one side is default strategy and the other is AMPLIFY_TABLE strategy', () => {
    const defaultStrategyDef = AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
      type Blog @model {
        description: String!
        posts: [Post] @manyToMany(relationName: "blogPosts")
      }
    `);
    const amplifyManagedStrategyDef = AmplifyGraphqlDefinition.fromString(
      /* GraphQL */ `
        type Post @model {
          description: String!
          blog: [Blog] @manyToMany(relationName: "blogPosts")
        }
      `,
      DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    );

    const stack = new cdk.Stack();
    const opts = {
      definition: AmplifyGraphqlDefinition.combine([defaultStrategyDef, amplifyManagedStrategyDef]),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    };

    expect(() => new AmplifyGraphqlApi(stack, 'TestApi', opts)).toThrowError(
      '@manyToMany directive cannot be used to relate models with a different DynamoDB-based strategies.',
    );
  });

  it('fails with manyToMany with an explicitly defined relationship type', () => {
    const schema = /* GraphQL */ `
      type Blog @model {
        description: String!
        posts: [Post] @manyToMany(relationName: "blogPosts")
      }

      type Post @model {
        description: String!
        blog: [Blog] @manyToMany(relationName: "blogPosts")
      }

      type BlogPost @model {
        id: ID!
        blogId: ID!
        blog: Blog @belongsTo
        postId: ID!
        post: Post @belongsTo
      }
    `;
    const stack = new cdk.Stack();
    const opts = {
      definition: AmplifyGraphqlDefinition.fromString(schema),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    };

    expect(() => new AmplifyGraphqlApi(stack, 'TestApi', opts)).toThrowError(
      'Blog must have a relationship with BlogPost in order to use @belongsTo.',
    );
  });

  it('fail with manyToMany with a SQL-based strategy', () => {
    const sqlStrategy = mockSqlDataSourceStrategy();
    const schema = /* GraphQL */ `
      type Blog @model {
        id: ID! @primaryKey
        description: String!
        posts: [Post] @manyToMany(relationName: "blogPosts")
      }

      type Post @model {
        id: ID! @primaryKey
        description: String!
        blog: [Blog] @manyToMany(relationName: "blogPosts")
      }
    `;
    const stack = new cdk.Stack();
    const opts = {
      definition: AmplifyGraphqlDefinition.fromString(schema, sqlStrategy),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    };

    expect(() => new AmplifyGraphqlApi(stack, 'TestApi', opts)).toThrowError('@manyToMany directive cannot be used on a SQL model.');
  });
});

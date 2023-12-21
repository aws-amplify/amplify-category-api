import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, DDB_DEFAULT_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy } from '@aws-amplify/graphql-transformer-test-utils';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { makeApiByCombining, verifySchema } from './test-utils';

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

  it('synths with both strategies as long as both sides of the manyToMany relationship share a strategy', () => {
    const defaultStrategyDef = AmplifyGraphqlDefinition.fromString(
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
      DDB_DEFAULT_DATASOURCE_STRATEGY,
    );

    const amplifyManagedStrategyDef = AmplifyGraphqlDefinition.fromString(
      /* GraphQL */ `
        type Todo @model {
          description: String!
          tags: [Tag] @manyToMany(relationName: "todoTags")
        }
        type Tag @model {
          description: String!
          todo: [Todo] @manyToMany(relationName: "todoTags")
        }
      `,
      DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    );

    expect(makeApiByCombining(defaultStrategyDef, amplifyManagedStrategyDef)).toBeDefined();
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

    expect(() => makeApiByCombining(defaultStrategyDef, amplifyManagedStrategyDef)).toThrowError(
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
    expect(() => verifySchema(schema)).toThrowError('Blog must have a relationship with BlogPost in order to use @belongsTo.');
  });

  it('fails if a many-to-many relationship is declared across a DDB/SQL boundary', () => {
    const postSchemaDdb = /* GraphQL */ `
      type Post @model {
        id: ID! @primaryKey
        title: String!
        content: String
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }
    `;

    const tagSchemaSql = /* GraphQL */ `
      type Tag @model {
        id: ID! @primaryKey
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `;
    const ddbdefinition = AmplifyGraphqlDefinition.fromString(postSchemaDdb);
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqldefinition = AmplifyGraphqlDefinition.fromString(tagSchemaSql, sqlStrategy1);
    expect(() => makeApiByCombining(ddbdefinition, sqldefinition)).toThrow();
  });

  it('fails if a many-to-many relationship is declared across a SQL boundary', () => {
    const postSchemaSql = /* GraphQL */ `
      type Post @model {
        id: ID! @primaryKey
        title: String!
        content: String
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }
    `;

    const tagSchemaSql = /* GraphQL */ `
      type Tag @model {
        id: ID! @primaryKey
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `;
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(postSchemaSql, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(tagSchemaSql, sqlStrategy2);
    expect(() => makeApiByCombining(definition1, definition2)).toThrow();
  });

  it('fails if a many-to-many relationship is declared in a single SQL data source', () => {
    const schema = /* GraphQL */ `
      type Post @model {
        id: ID! @primaryKey
        title: String!
        content: String
        tags: [Tag] @manyToMany(relationName: "PostTags")
      }
      type Tag @model {
        id: ID! @primaryKey
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
      }
    `;
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const definition1 = AmplifyGraphqlDefinition.fromString(schema, sqlStrategy1);
    expect(() => makeApiByCombining(definition1)).toThrow();
  });
});

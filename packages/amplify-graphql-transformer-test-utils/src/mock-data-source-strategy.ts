import { ModelDataSourceStrategy, SQLLambdaModelDataSourceStrategy } from 'graphql-transformer-common';

export const MOCK_SCHEMA = {
  todo: {
    ddb: /* GraphQL */ `
      type Todo @model {
        id: ID!
        content: String!
      }
    `,
    sql: /* GraphQL */ `
      type Todo @model @refersTo(name: "todos") {
        id: ID! @primaryKey
        content: String!
      }
    `,

    auth: {
      owner: {
        ddb: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: owner }]) {
            id: ID!
            content: String!
          }
        `,
        sql: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: owner }]) @refersTo(name: "todos") {
            id: ID! @primaryKey
            content: String!
          }
        `,
      },
    },
  },

  blog: {
    ddb: /* GraphQL */ `
      type Blog @model {
        id: ID!
        title: String!
        posts: [Post] @hasMany
      }
    `,
    sql: /* GraphQL */ `
      type Blog @model @refersTo(name: "blogs") {
        id: ID! @primaryKey
        title: String!
        posts: [Post] @hasMany
      }
    `,
  },

  post: {
    ddb: /* GraphQL */ `
      type Post @model {
        id: ID!
        content: String!
        blogId: ID!
        blog: Blog @belongsTo
      }
    `,
    sql: /* GraphQL */ `
      type Post @model @refersTo(name: "posts") {
        id: ID! @primaryKey
        content: String!
        blogId: ID!
        blog: Blog @belongsTo
      }
    `,
  },

  author: {
    ddb: /* GraphQL */ `
      type Author @model {
        id: ID!
        name: String!
      }
    `,
    sql: /* GraphQL */ `
      type Author @model @refersTo(name: "authors") {
        id: ID! @primaryKey
        name: String!
      }
    `,
  },

  comment: {
    ddb: /* GraphQL */ `
      type Comment @model {
        id: ID!
        name: String!
        postId: ID!
        post: Post @belongsTo
      }
    `,
    sql: /* GraphQL */ `
      type Comment @model @refersTo(name: "comments") {
        id: ID! @primaryKey
        name: String!
        postId: ID!
        post: Post @belongsTo
      }
    `,
  },

  manyToMany: {
    post: {
      ddb: /* GraphQL */ `
        type Post @model {
          id: ID!
          title: String!
          content: String
          tags: [Tag] @manyToMany(relationName: "PostTags")
        }
      `,

      sql: /* GraphQL */ `
        type Post @model @refersTo(name: "posts") {
          id: ID! @primaryKey
          title: String!
          content: String
          tags: [Tag] @manyToMany(relationName: "PostTags")
        }
      `,
    },

    tag: {
      ddb: /* GraphQL */ `
        type Tag @model {
          id: ID!
          label: String!
          posts: [Post] @manyToMany(relationName: "PostTags")
        }
      `,

      sql: /* GraphQL */ `
        type Tag @model @refersTo(name: "tags") {
          id: ID! @primaryKey
          label: String!
          posts: [Post] @manyToMany(relationName: "PostTags")
        }
      `,
    },
  },

  customSql: {
    statements: {
      query: 'SELECT foo FROM custom_table',
      mutation: 'UPDATE custom_table SET foo="abc"',
    },
    sql: /* GraphQL */ `
      type Query {
        customQueryStatement: String @sql(statement: "SELECT foo FROM custom_table")
        customQueryReference: String @sql(reference: "myCustomQueryReference")
      }
      type Mutation {
        customMutationStatement: Int @sql(statement: "UPDATE custom_table SET foo='abc'")
        customMutationReference: Int @sql(reference: "myCustomMutationReference")
      }
    `,
  },
};

export const makeSqlDataSourceStrategiesForModelList = (
  strategyName: string,
  modelNames: string[],
  strategyOverrides: Partial<SQLLambdaModelDataSourceStrategy> = {},
): Record<string, ModelDataSourceStrategy> => {
  const strategy = makeSqlDataSourceStrategy(strategyName, strategyOverrides);
  const dataSourceStrategies: Record<string, ModelDataSourceStrategy> = modelNames.reduce((acc, model) => {
    acc[model] = strategy;
    return acc;
  }, {} as Record<string, ModelDataSourceStrategy>);
  return dataSourceStrategies;
};

export const makeSqlDataSourceStrategy = (
  strategyName: string,
  strategyOverrides: Partial<SQLLambdaModelDataSourceStrategy> = {},
): SQLLambdaModelDataSourceStrategy => {
  const strategy: SQLLambdaModelDataSourceStrategy = {
    name: strategyName,
    dbType: 'MYSQL',
    dbConnectionConfig: {
      hostnameSsmPath: `/ssm/path/to/${strategyName}/hostname`,
      portSsmPath: `/ssm/path/to/${strategyName}/portSsmP`,
      usernameSsmPath: `/ssm/path/to/${strategyName}/username`,
      passwordSsmPath: `/ssm/path/to/${strategyName}/password`,
      databaseNameSsmPath: `/ssm/path/to/${strategyName}/database`,
    },
    vpcConfiguration: {
      vpcId: `vpc-${strategyName}-12345`,
      securityGroupIds: [`sg-${strategyName}-12345`],
      subnetAvailabilityZoneConfig: [{ subnetId: `subnet-${strategyName}-12345`, availabilityZone: 'us-east-1a' }],
    },
    ...strategyOverrides,
  };

  return strategy;
};

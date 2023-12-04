/**
 * Schema snippets. Unless otherwise specified, the following characteristics apply to each snippet:
 * - The type has a `@model` declaration
 * - The snippet declares no `@auth` rules
 *
 * Each snippet is broken into `ddb` and `sql` flavors. The `sql` flavor has the following characteristics:
 * - It specifies `@primaryKey` directive on `id`
 * - Snippets with relationships (`hasOne`, `belongsTo`, etc) specifies a `references` attribute
 */
export const SCHEMAS = {
  /**
   * A simple standalone Todo schema with a `@model` declaration, no authorization rules. However, to allow compatibility with both DDB and
   * SQL types, this schema also adds a `@primaryKey` directive on ID.
   */
  todo: {
    ddb: /* GraphQL */ `
      type Todo @model {
        id: ID!
        title: String!
      }
    `,
    sql: /* GraphQL */ `
      type Todo @model {
        id: ID! @primaryKey
        title: String!
      }
    `,
  },

  /**
   * A clone of `Todo` with a different type name so they can both be used in the same schema.
   */
  todo2: {
    ddb: /* GraphQL */ `
      type Todo2 @model {
        id: ID!
        title: String!
      }
    `,
    sql: /* GraphQL */ `
      type Todo2 @model {
        id: ID! @primaryKey
        title: String!
      }
    `,
  },

  /**
   * A clone of `Todo` with a different type name so they can both be used in the same schema.
   */
  todo3: {
    ddb: /* GraphQL */ `
      type Todo3 @model {
        id: ID!
        title: String!
      }
    `,
    sql: /* GraphQL */ `
      type Todo3 @model {
        id: ID! @primaryKey
        title: String!
      }
    `,
  },

  /**
   * A clone of `Todo` with a different type name so they can both be used in the same schema.
   */
  todo4: {
    ddb: /* GraphQL */ `
      type Todo4 @model {
        id: ID!
        title: String!
      }
    `,
    sql: /* GraphQL */ `
      type Todo4 @model {
        id: ID! @primaryKey
        title: String!
      }
    `,
  },

  /**
   * A schema snippet for a Blog with a `@hasMany` relationship to Post, no `@auth` rules. Adds `@primaryKey` directive to the `id` field to
   * maintain compatibility with both DDB and SQL.
   */
  blog: {
    ddb: /* GraphQL */ `
      type Blog @model {
        id: ID!
        name: String!
        posts: [Post] @hasMany
      }
    `,
    sql: /* GraphQL */ `
      type Blog @model {
        id: ID! @primaryKey
        name: String!
        posts: [Post] @hasMany(references: ["blogId"])
      }
    `,
  },

  /**
   * A schema snippet for a Post with a a `@belongsTo` relationship to Blog and a `@hasMany` relationship to Comment
   */
  post: {
    ddb: /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String!
        blogId: ID!
        blog: Blog @belongsTo
        comments: [Comment] @hasMany
      }
    `,
    sql: /* GraphQL */ `
      type Post @model {
        id: ID! @primaryKey
        title: String!
        blogId: ID!
        blog: Blog @belongsTo(references: ["blogId"])
        comments: [Comment] @hasMany(references: ["postId"])
      }
    `,
  },

  /**
   * A schema snippet for a Comment with a a `@belongsTo` relationship to Post
   */
  comment: {
    ddb: /* GraphQL */ `
      type Comment @model {
        id: ID!
        postId: ID!
        post: Post @belongsTo
        content: String!
      }
    `,
    sql: /* GraphQL */ `
      type Comment @model {
        id: ID! @primaryKey
        postId: ID!
        post: Post @belongsTo(references: ["postId"])
        content: String!
      }
    `,
  },

  /**
   * A schema snippet for an Article with a `@hasMany` relationship to Tag, no authorization rules. However, to allow compatibility with
   * both DDB and SQL types, this schema also adds a `@primaryKey` directive on ID. That means this schema is not suitable for primary key
   * testing.
   */
  order: {
    ddb: /* GraphQL */ `
      type Order @model {
        id: ID!
        content: String
        lineItem: [LineItem] @hasMany
      }
    `,
    sql: /* GraphQL */ `
      type Order @model {
        id: ID! @primaryKey
        content: String
        lineItem: [LineItem] @hasMany(references: ["orderId"])
      }
    `,
  },

  /**
   * A schema snippet for a LineItem with a `@belongsTo` relationship to Order, no authorization rules. However, to allow compatibility with
   * both DDB and SQL types, this schema also adds a `@primaryKey` directive on ID and `references` attributes on the relationships. That
   * means this schema is not suitable for primary key testing.
   */
  lineItem: {
    ddb: /* GraphQL */ `
      type LineItem @model {
        id: ID!
        name: String!
        orderId: ID!
        order: Order @belongsTo
      }
    `,
    sql: /* GraphQL */ `
      type LineItem @model {
        id: ID! @primaryKey
        name: String!
        orderId: ID!
        order: Order @belongsTo(references: ["orderId"])
      }
    `,
  },

  /**
   * A custom Query snippet with a `@sql` directive using a `statement` attribute to specify the custom SQL
   */
  customSqlQueryStatement: /* GraphQL */ `
    type Query {
      customSqlQueryStatement: [Int] @sql(statement: "SELECT 1")
    }
  `,

  /**
   * A custom Query snippet with a `@sql` directive using a `reference` attribute with the value 'customSqlQueryReference'
   */
  customSqlQueryReference: /* GraphQL */ `
    type Query {
      customSqlQueryReference: [Int] @sql(reference: "customSqlQueryReference")
    }
  `,

  /**
   * A custom Mutation snippet with a `@sql` directive using a `statement` attribute to specify the custom SQL
   */
  customSqlMutationStatement: /* GraphQL */ `
    type Mutation {
      customSqlMutationStatement: [Int] @sql(statement: "UPDATE mytable SET id=1; SELECT 1")
    }
  `,

  /**
   * A custom Mutation snippet with a `@sql` directive using a `reference` attribute with the value 'customSqlReference'
   */
  customSqlMutationReference: /* GraphQL */ `
    type Mutation {
      customSqlMutationReference: [Int] @sql(reference: "customSqlMutationReference")
    }
  `,
};

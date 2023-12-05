import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, DDB_DEFAULT_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, SCHEMAS } from '@aws-amplify/graphql-transformer-test-utils';
import { AmplifyGraphqlDefinition } from '../amplify-graphql-definition';

describe('AmplifyGraphqlDefinition.combine definition behavior', () => {
  it('handles a single definition', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1]);
    expect(combinedDefinition.schema).toEqual(`${SCHEMAS.todo.ddb}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_DEFAULT_DATASOURCE_STRATEGY,
    });
  });

  it('combines homogenous independent DDB default definitions into a definition with one ModelDataSourceStrategy', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_DEFAULT_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_DEFAULT_DATASOURCE_STRATEGY,
      Todo2: DDB_DEFAULT_DATASOURCE_STRATEGY,
    });
  });

  it('combines homogenous independent DDB Amplify-managed table definitions into a definition with one ModelDataSourceStrategy', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      Todo2: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    });
  });

  it('combines homogenous related DDB default definitions into a definition with one ModelDataSourceStrategy', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.ddb, DDB_DEFAULT_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Order: DDB_DEFAULT_DATASOURCE_STRATEGY,
      LineItem: DDB_DEFAULT_DATASOURCE_STRATEGY,
    });
  });

  it('combines homogenous related DDB Amplify-managed table definitions into a definition with one ModelDataSourceStrategy', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Order: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      LineItem: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    });
  });

  it('combines heterogeneous independent DDB table definitions into a definition with multiple ModelDataSourceStrategies', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_DEFAULT_DATASOURCE_STRATEGY,
      Todo2: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    });
  });

  it('combines heterogeneous related DDB table definitions into a definition with multiple ModelDataSourceStrategies', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Order: DDB_DEFAULT_DATASOURCE_STRATEGY,
      LineItem: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    });
  });

  it('combines heterogeneous independent SQL table definitions into an API with multiple ModelDataSourceStrategies', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.sql, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: sqlStrategy1,
      Todo2: sqlStrategy2,
    });
  });

  it('combines heterogeneous related SQL table definitions into an API with multiple ModelDataSourceStrategies', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.order.sql, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.lineItem.sql, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Order: sqlStrategy1,
      LineItem: sqlStrategy2,
    });
  });

  it('combines heterogeneous independent definitions for multiple supported db types into an API with multiple ModelDataSourceStrategies', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition3 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo3.sql, sqlStrategy1);
    const definition4 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo4.sql, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3, definition4]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_DEFAULT_DATASOURCE_STRATEGY,
      Todo2: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      Todo3: sqlStrategy1,
      Todo4: sqlStrategy2,
    });
  });

  it('combines heterogeneous related definitions for multiple supported db types into an API with multiple ModelDataSourceStrategies', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.blog.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.post.sql, sqlStrategy1);
    const definition3 = AmplifyGraphqlDefinition.fromString(SCHEMAS.comment.sql, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Blog: DDB_DEFAULT_DATASOURCE_STRATEGY,
      Post: sqlStrategy1,
      Comment: sqlStrategy2,
    });
  });

  it('fails if a SQL-based ModelDataSourceStrategy name is reused across definitions, even if the objects are the same shape', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.sql, sqlStrategy2);
    expect(() => AmplifyGraphqlDefinition.combine([definition1, definition2])).toThrowError(
      "The SQL-based ModelDataSourceStrategy 'sqlDefinition1' was found in multiple definitions, but a strategy name cannot be " +
        "shared between definitions. To specify a SQL-based API with schemas across multiple files, use 'fromFilesAndStrategy'",
    );
  });

  it('supports nested combined definitions', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
    const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition3 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo3.sql, sqlStrategy1);
    const definition4 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo4.sql, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([
      definition1,
      AmplifyGraphqlDefinition.combine([definition2, AmplifyGraphqlDefinition.combine([definition3, definition4])]),
    ]);
    expect(combinedDefinition.schema).toMatchSnapshot();
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_DEFAULT_DATASOURCE_STRATEGY,
      Todo2: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      Todo3: sqlStrategy1,
      Todo4: sqlStrategy2,
    });
  });

  describe('Custom SQL support', () => {
    it('supports a schema with both models and custom SQL inline queries', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
      const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryStatement, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toMatchSnapshot();
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Todo: sqlStrategy1,
      });
      expect(combinedDefinition.customSqlDataSourceStrategies).toEqual(
        expect.arrayContaining([
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryStatement',
            strategy: sqlStrategy2,
          },
        ]),
      );
    });

    it('supports a schema with both models and custom SQL referenced queries', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
      const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryReference, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toMatchSnapshot();
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Todo: sqlStrategy1,
      });
      expect(combinedDefinition.customSqlDataSourceStrategies).toEqual(
        expect.arrayContaining([
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryReference',
            strategy: sqlStrategy2,
          },
        ]),
      );
    });

    it('supports a schema with both models and custom SQL with a mix of inline and referenced queries', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
      const sqlStrategy3 = mockSqlDataSourceStrategy({ name: 'sqlDefinition3' });
      const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryStatement, sqlStrategy2);
      const definition3 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryReference, sqlStrategy3);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3]);
      expect(combinedDefinition.schema).toMatchSnapshot();
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Todo: sqlStrategy1,
      });
      expect(combinedDefinition.customSqlDataSourceStrategies).toEqual(
        expect.arrayContaining([
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryStatement',
            strategy: sqlStrategy2,
          },
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryReference',
            strategy: sqlStrategy3,
          },
        ]),
      );
    });

    it('supports a extending Query and Mutation in multiple definitions', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
      const sqlStrategy3 = mockSqlDataSourceStrategy({ name: 'sqlDefinition3' });
      const sqlStrategy4 = mockSqlDataSourceStrategy({ name: 'sqlDefinition4' });
      const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryStatement + SCHEMAS.todo.sql, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryReference, sqlStrategy2);
      const definition3 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlMutationStatement, sqlStrategy3);
      const definition4 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlMutationReference, sqlStrategy4);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3, definition4]);

      expect(combinedDefinition.schema).toMatchSnapshot();
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Todo: sqlStrategy1,
      });
      expect(combinedDefinition.customSqlDataSourceStrategies).toEqual(
        expect.arrayContaining([
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryStatement',
            strategy: sqlStrategy1,
          },
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryReference',
            strategy: sqlStrategy2,
          },
          {
            typeName: 'Mutation',
            fieldName: 'customSqlMutationStatement',
            strategy: sqlStrategy3,
          },
          {
            typeName: 'Mutation',
            fieldName: 'customSqlMutationReference',
            strategy: sqlStrategy4,
          },
        ]),
      );
    });

    it('supports a schema with only custom SQL inline queries', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
      const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryStatement, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlMutationStatement, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toMatchSnapshot();
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({});
      expect(combinedDefinition.customSqlDataSourceStrategies).toEqual(
        expect.arrayContaining([
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryStatement',
            strategy: sqlStrategy1,
          },
          {
            typeName: 'Mutation',
            fieldName: 'customSqlMutationStatement',
            strategy: sqlStrategy2,
          },
        ]),
      );
    });

    it('supports a schema with only custom SQL referenced queries', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
      const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryReference, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlMutationReference, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toMatchSnapshot();
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({});
      expect(combinedDefinition.customSqlDataSourceStrategies).toEqual(
        expect.arrayContaining([
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryReference',
            strategy: sqlStrategy1,
          },
          {
            typeName: 'Mutation',
            fieldName: 'customSqlMutationReference',
            strategy: sqlStrategy2,
          },
        ]),
      );
    });

    it('supports a schema with only custom SQL with a mix of inline and referenced queries', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
      const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryStatement, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryReference, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toMatchSnapshot();
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({});
      expect(combinedDefinition.customSqlDataSourceStrategies).toEqual(
        expect.arrayContaining([
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryStatement',
            strategy: sqlStrategy1,
          },
          {
            typeName: 'Query',
            fieldName: 'customSqlQueryReference',
            strategy: sqlStrategy2,
          },
        ]),
      );
    });

    it('supports a schema with a mix of models and custom sql', () => {
      const ddbSchema = /* GraphQL */ `
        type Post @model {
          id: ID!
          title: String!
          comments: [Comment] @hasMany
        }

        type Comment @model {
          id: ID!
          content: String!
          post: Post @belongsTo
        }
      `;

      const mysqlSchema = /* GraphQL */ `
        type Project @model {
          id: ID! @primaryKey
          name: String
          team: Team @hasOne(references: ["projectId"])
        }
        type Query {
          selectOne: [String] @sql(statement: "SELECT 'mysql=1'")
        }
      `;

      const postgresSchema = /* GraphQL */ `
        type Team @model {
          id: ID! @primaryKey
          name: String!
          projectId: ID!
          project: Project @belongsTo(references: ["projectId"])
        }
        type Query {
          selectTwo: [String] @sql(statement: "SELECT 'postgres=2'")
        }
      `;

      const mysqlStrategy = mockSqlDataSourceStrategy();
      const postgresStrategy = mockSqlDataSourceStrategy({ dbType: 'POSTGRES' });
      const definition1 = AmplifyGraphqlDefinition.fromString(ddbSchema);
      const definition2 = AmplifyGraphqlDefinition.fromString(mysqlSchema, mysqlStrategy);
      const definition3 = AmplifyGraphqlDefinition.fromString(postgresSchema, postgresStrategy);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3]);
      expect(combinedDefinition.schema).toMatchSnapshot();
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Post: DDB_DEFAULT_DATASOURCE_STRATEGY,
        Comment: DDB_DEFAULT_DATASOURCE_STRATEGY,
        Project: mysqlStrategy,
        Team: postgresStrategy,
      });
      expect(combinedDefinition.customSqlDataSourceStrategies).toEqual(
        expect.arrayContaining([
          {
            typeName: 'Query',
            fieldName: 'selectOne',
            strategy: mysqlStrategy,
          },
          {
            typeName: 'Query',
            fieldName: 'selectTwo',
            strategy: postgresStrategy,
          },
        ]),
      );
    });

    it('fails if a custom SQL Query field is declared in multiple definitions', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
      const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryStatement, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlQueryStatement, sqlStrategy2);
      expect(() => AmplifyGraphqlDefinition.combine([definition1, definition2])).toThrowError(
        "The custom Query field 'customSqlQueryStatement' was found in multiple definitions, but a field name cannot be shared between definitions.",
      );
    });

    it('fails if a custom SQL Mutation field is declared in multiple definitions', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
      const definition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlMutationStatement, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.customSqlMutationStatement, sqlStrategy2);
      expect(() => AmplifyGraphqlDefinition.combine([definition1, definition2])).toThrowError(
        "The custom Mutation field 'customSqlMutationStatement' was found in multiple definitions, but a field name cannot be shared between definitions.",
      );
    });
  });
});

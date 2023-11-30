import * as os from 'os';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY, DDB_DEFAULT_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, SNIPPETS } from '@aws-amplify/graphql-transformer-test-utils';
import { AmplifyGraphqlDefinition } from '../amplify-graphql-definition';

describe('AmplifyGraphqlDefinition.combine definition behavior', () => {
  it('handles a single definition', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1]);
    expect(combinedDefinition.schema).toEqual(`${SNIPPETS.todo}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_DEFAULT_DATASOURCE_STRATEGY,
    });
  });

  it('combines homogenous independent DDB default definitions into a definition with one ModelDataSourceStrategy', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo2, DDB_DEFAULT_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toEqual(`${SNIPPETS.todo}${os.EOL}${SNIPPETS.todo2}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_DEFAULT_DATASOURCE_STRATEGY,
      Todo2: DDB_DEFAULT_DATASOURCE_STRATEGY,
    });
  });

  it('combines homogenous independent DDB Amplify-managed table definitions into a definition with one ModelDataSourceStrategy', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo2, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toEqual(`${SNIPPETS.todo}${os.EOL}${SNIPPETS.todo2}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      Todo2: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    });
  });

  it('combines homogenous related DDB default definitions into a definition with one ModelDataSourceStrategy', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.order);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.lineItem, DDB_DEFAULT_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toEqual(`${SNIPPETS.order}${os.EOL}${SNIPPETS.lineItem}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Order: DDB_DEFAULT_DATASOURCE_STRATEGY,
      LineItem: DDB_DEFAULT_DATASOURCE_STRATEGY,
    });
  });

  it('combines homogenous related DDB Amplify-managed table definitions into a definition with one ModelDataSourceStrategy', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.order, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.lineItem, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toEqual(`${SNIPPETS.order}${os.EOL}${SNIPPETS.lineItem}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Order: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      LineItem: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    });
  });

  it('combines heterogeneous independent DDB table definitions into a definition with multiple ModelDataSourceStrategies', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo2, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toEqual(`${SNIPPETS.todo}${os.EOL}${SNIPPETS.todo2}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: DDB_DEFAULT_DATASOURCE_STRATEGY,
      Todo2: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    });
  });

  it('combines heterogeneous related DDB table definitions into a definition with multiple ModelDataSourceStrategies', () => {
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.order);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.lineItem, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toEqual(`${SNIPPETS.order}${os.EOL}${SNIPPETS.lineItem}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Order: DDB_DEFAULT_DATASOURCE_STRATEGY,
      LineItem: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
    });
  });

  it('combines heterogeneous independent SQL table definitions into an API with multiple ModelDataSourceStrategies', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo2, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toEqual(`${SNIPPETS.todo}${os.EOL}${SNIPPETS.todo2}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Todo: sqlStrategy1,
      Todo2: sqlStrategy2,
    });
  });

  it('combines heterogeneous related SQL table definitions into an API with multiple ModelDataSourceStrategies', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.order, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.lineItem, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
    expect(combinedDefinition.schema).toEqual(`${SNIPPETS.order}${os.EOL}${SNIPPETS.lineItem}`);
    expect(combinedDefinition.functionSlots.length).toEqual(0);
    expect(combinedDefinition.dataSourceStrategies).toEqual({
      Order: sqlStrategy1,
      LineItem: sqlStrategy2,
    });
  });

  it('combines heterogeneous independent definitions for multiple supported db types into an API with multiple ModelDataSourceStrategies', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo2, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition3 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo3, sqlStrategy1);
    const definition4 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo4, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3, definition4]);
    expect(combinedDefinition.schema).toEqual([SNIPPETS.todo, SNIPPETS.todo2, SNIPPETS.todo3, SNIPPETS.todo4].join(os.EOL));
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
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.blog);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.post, sqlStrategy1);
    const definition3 = AmplifyGraphqlDefinition.fromString(SNIPPETS.comment, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3]);
    expect(combinedDefinition.schema).toEqual([SNIPPETS.blog, SNIPPETS.post, SNIPPETS.comment].join(os.EOL));
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
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo, sqlStrategy1);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo2, sqlStrategy2);
    expect(() => AmplifyGraphqlDefinition.combine([definition1, definition2])).toThrow();
  });

  it('supports nested combined definitions', () => {
    const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlDefinition1' });
    const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlDefinition2' });
    const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo);
    const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo2, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
    const definition3 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo3, sqlStrategy1);
    const definition4 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo4, sqlStrategy2);
    const combinedDefinition = AmplifyGraphqlDefinition.combine([
      definition1,
      AmplifyGraphqlDefinition.combine([definition2, AmplifyGraphqlDefinition.combine([definition3, definition4])]),
    ]);
    expect(combinedDefinition.schema).toEqual([SNIPPETS.todo, SNIPPETS.todo2, SNIPPETS.todo3, SNIPPETS.todo4].join(os.EOL));
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
      const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryStatement, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual([SNIPPETS.todo, SNIPPETS.customSqlQueryStatement].join(os.EOL));
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
      const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryReference, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual([SNIPPETS.todo, SNIPPETS.customSqlQueryReference].join(os.EOL));
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
      const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.todo, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryStatement, sqlStrategy2);
      const definition3 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryReference, sqlStrategy3);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3]);
      expect(combinedDefinition.schema).toEqual(
        [SNIPPETS.todo, SNIPPETS.customSqlQueryStatement, SNIPPETS.customSqlQueryReference].join(os.EOL),
      );
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
      const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryStatement, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryReference, sqlStrategy2);
      const definition3 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlMutationStatement, sqlStrategy3);
      const definition4 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlMutationReference, sqlStrategy4);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3, definition4]);
      expect(combinedDefinition.schema).toEqual(
        [
          SNIPPETS.customSqlQueryStatement,
          SNIPPETS.customSqlQueryReference,
          SNIPPETS.customSqlMutationStatement,
          SNIPPETS.customSqlMutationReference,
        ].join(os.EOL),
      );
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
      const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryStatement, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlMutationStatement, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual([SNIPPETS.customSqlQueryStatement, SNIPPETS.customSqlMutationStatement].join(os.EOL));
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
      const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryReference, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlMutationReference, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual([SNIPPETS.customSqlQueryReference, SNIPPETS.customSqlMutationReference].join(os.EOL));
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
      const definition1 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryStatement, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(SNIPPETS.customSqlQueryReference, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual([SNIPPETS.customSqlQueryStatement, SNIPPETS.customSqlQueryReference].join(os.EOL));
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
  });
});

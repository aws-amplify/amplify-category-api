import { constructCustomSqlDataSourceStrategies, getDataSourceStrategiesProvider } from '../../internal/data-source-config';
import { SQLLambdaModelDataSourceStrategy, SqlModelDataSourceDbConnectionConfig } from '../../model-datasource-strategy-types';
import { IAmplifyGraphqlDefinition } from '../../types';

describe('datasource config', () => {
  const dbConnectionConfig: SqlModelDataSourceDbConnectionConfig = {
    hostnameSsmPath: '/test/hostname',
    portSsmPath: '/test/port',
    usernameSsmPath: '/test/username',
    passwordSsmPath: '/test/password',
    databaseNameSsmPath: '/test/databaseName',
  };

  it('constructCustomSqlDataSourceStrategies', () => {
    const schema = /* GraphQL */ `
      type Todo @model {
        id: ID! @primaryKey
        description: String
      }
      type Query {
        myCustomQuery: [Int] @sql(statement: "SELECT 1")
      }
      type Mutation {
        myCustomMutation: [Int] @sql(statement: "UPDATE mytable SET id=1; SELECT 1;")
      }
    `;

    const mysqlStrategy: SQLLambdaModelDataSourceStrategy = {
      name: 'mysqlStrategy',
      dbType: 'MYSQL',
      dbConnectionConfig,
    };

    const sqlDataSourceStrategies = constructCustomSqlDataSourceStrategies(schema, mysqlStrategy);
    expect(sqlDataSourceStrategies).toEqual(
      expect.arrayContaining([
        {
          typeName: 'Query',
          fieldName: 'myCustomQuery',
          strategy: mysqlStrategy,
        },
        {
          typeName: 'Mutation',
          fieldName: 'myCustomMutation',
          strategy: mysqlStrategy,
        },
      ]),
    );
  });

  it('getDataSourceStrategiesProvider for a single definition', () => {
    const schema = /* GraphQL */ `
      type Todo @model {
        id: ID! @primaryKey
        description: String
      }
      type Query {
        myCustomQuery: [Int] @sql(reference: "myCustomQuery")
      }
      type Mutation {
        myCustomMutation: [Int] @sql(reference: "myCustomMutation")
      }
    `;

    const strategy: SQLLambdaModelDataSourceStrategy = {
      name: 'strategy',
      dbType: 'MYSQL',
      dbConnectionConfig,
      customSqlStatements: {
        myCustomQuery: 'SELECT 1;',
        myCustomMutation: 'UPDATE mytable SET id=1; SELECT 1;',
      },
    };

    const definition: IAmplifyGraphqlDefinition = {
      schema,
      functionSlots: [],
      dataSourceStrategies: {
        Todo: strategy,
      },
      customSqlDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'myCustomQuery',
          strategy,
        },
        {
          typeName: 'Mutation',
          fieldName: 'myCustomMutation',
          strategy,
        },
      ],
    };

    const provider = getDataSourceStrategiesProvider(definition);
    // We don't care that the custom SQL is defined on the internal type, as long as it's collected into the sqlDirective strategies
    expect(provider.dataSourceStrategies).toMatchObject({
      Todo: strategy,
    });

    expect(provider.sqlDirectiveDataSourceStrategies).toEqual(
      expect.arrayContaining([
        {
          typeName: 'Query',
          fieldName: 'myCustomQuery',
          strategy: strategy,
          customSqlStatements: {
            myCustomQuery: 'SELECT 1;',
            myCustomMutation: 'UPDATE mytable SET id=1; SELECT 1;',
          },
        },
        {
          typeName: 'Mutation',
          fieldName: 'myCustomMutation',
          strategy: strategy,
          customSqlStatements: {
            myCustomQuery: 'SELECT 1;',
            myCustomMutation: 'UPDATE mytable SET id=1; SELECT 1;',
          },
        },
      ]),
    );
  });
});

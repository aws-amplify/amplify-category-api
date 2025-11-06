import {
  DataSourceStrategiesProvider,
  ModelDataSourceStrategy,
  SQLLambdaModelDataSourceStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DDB_DEFAULT_DATASOURCE_STRATEGY, MYSQL_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import {
  checkForUnsupportedDirectives,
  containsSqlModelOrDirective,
} from '../../../../provider-utils/awscloudformation/utils/rds-resources/utils';

describe('check for unsupported RDS directives', () => {
  const dbConnectionConfig = {
    databaseNameSsmPath: '/databaseNameSsmPath',
    hostnameSsmPath: '/hostnameSsmPath',
    portSsmPath: '/portSsmPath',
    usernameSsmPath: '/usernameSsmPath',
    passwordSsmPath: '/passwordSsmPath',
  };

  const dataSourceStrategies: Record<string, ModelDataSourceStrategy> = {
    Post: {
      name: 'mysqlstrategy',
      dbType: MYSQL_DB_TYPE,
      dbConnectionConfig,
    },
    Tag: DDB_DEFAULT_DATASOURCE_STRATEGY,
  };

  const ddbDataSourceStrategies: Record<string, ModelDataSourceStrategy> = {
    Post: DDB_DEFAULT_DATASOURCE_STRATEGY,
    Tag: DDB_DEFAULT_DATASOURCE_STRATEGY,
  };

  const strategy: SQLLambdaModelDataSourceStrategy = {
    name: 'strategy',
    dbType: 'MYSQL',
    dbConnectionConfig,
  };

  const sqlDirectiveDataSourceStrategies = [
    {
      typeName: 'Query' as const,
      fieldName: 'myCustomQuery',
      strategy: strategy,
      customSqlStatements: {
        myCustomQuery: 'SELECT 1;',
        myCustomMutation: 'UPDATE mytable SET id=1; SELECT 1;',
      },
    },
  ];

  const dataSourceStrategiesProvider: DataSourceStrategiesProvider = { dataSourceStrategies };
  const emptyProvider: DataSourceStrategiesProvider = { dataSourceStrategies: {} };

  it('should throw error if searchable directive is present on a model', () => {
    const schema = `
            type Post @model @searchable {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, dataSourceStrategiesProvider)).toThrowErrorMatchingInlineSnapshot(
      '"@searchable directive on type \\"Post\\"  is not supported on a SQL datasource. Following directives are not supported on a SQL datasource: searchable, predictions, function, manyToMany, http, mapsTo"',
    );
  });

  it('should throw error if predictions directive is present on a query type field', () => {
    const schema = `
            type Query {
                recognizeTextFromImage: String @predictions(actions: [identifyText])
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, dataSourceStrategiesProvider)).toThrowErrorMatchingInlineSnapshot(
      '"@predictions directive on type \\"Query\\" and field \\"recognizeTextFromImage\\" is not supported on a SQL datasource. Following directives are not supported on a SQL datasource: searchable, predictions, function, manyToMany, http, mapsTo"',
    );
  });

  it('should throw error if function directive is present on a field', () => {
    const schema = `
            type Query {
                echo(msg: String): String @function(name: "echofunction")
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, dataSourceStrategiesProvider)).toThrowErrorMatchingInlineSnapshot(
      '"@function directive on type \\"Query\\" and field \\"echo\\" is not supported on a SQL datasource. Following directives are not supported on a SQL datasource: searchable, predictions, function, manyToMany, http, mapsTo"',
    );
  });

  it('should throw error if manyToMany directive is present on a field', () => {
    const schema = `
            type Post @model {
                id: ID!
                title: String!
                content: String
                tags: [Tag] @manyToMany(relationName: "PostTags")
            }
            
            type Tag @model {
                id: ID!
                label: String!
                posts: [Post] @manyToMany(relationName: "PostTags")
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, dataSourceStrategiesProvider)).toThrowErrorMatchingInlineSnapshot(
      '"@manyToMany directive on type \\"Post\\" and field \\"tags\\" is not supported on a SQL datasource. Following directives are not supported on a SQL datasource: searchable, predictions, function, manyToMany, http, mapsTo"',
    );
  });

  it('should throw error if http directive is present on a field', () => {
    const schema = `
            type Post {
                id: ID!
                title: String
                description: String
                views: Int
            }
            
            type Query {
                listPosts: [Post] @http(url: "https://www.example.com/posts")
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, dataSourceStrategiesProvider)).toThrowErrorMatchingInlineSnapshot(
      '"@http directive on type \\"Query\\" and field \\"listPosts\\" is not supported on a SQL datasource. Following directives are not supported on a SQL datasource: searchable, predictions, function, manyToMany, http, mapsTo"',
    );
  });

  it('should throw error if mapsTo directive is present on a model', () => {
    const schema = `
            type Post @model @mapsTo(name: "Article") {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, dataSourceStrategiesProvider)).toThrowErrorMatchingInlineSnapshot(
      '"@mapsTo directive on type \\"Post\\"  is not supported on a SQL datasource. Following directives are not supported on a SQL datasource: searchable, predictions, function, manyToMany, http, mapsTo"',
    );
  });

  it('should not throw error if there are only DDB models', () => {
    const schema = `
            type Post @model @mapsTo(name: "Article") {
                id: ID!
                title: String!
            }
        `;
    const ddbProvider: DataSourceStrategiesProvider = {
      dataSourceStrategies: {
        Post: DDB_DEFAULT_DATASOURCE_STRATEGY,
      },
    };
    expect(() => checkForUnsupportedDirectives(schema, ddbProvider)).not.toThrow();
  });

  it('early return if model_to_datasource map is empty or undefined', () => {
    const schema = `
            type Post @model @mapsTo(name: "Article") {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, emptyProvider)).not.toThrow();
  });

  it('early return for a schema with no models', () => {
    const schema = `
            type Post {
                id: ID!
                title: String!
            }
        `;
    expect(() => checkForUnsupportedDirectives(schema, emptyProvider)).not.toThrow();
  });

  it('early return if schema is empty or undefined', () => {
    const schema = '';
    expect(() => checkForUnsupportedDirectives(schema, dataSourceStrategiesProvider)).not.toThrow();
  });

  it('containsSqlModelOrDirective should return true if there are sql models', () => {
    expect(containsSqlModelOrDirective(dataSourceStrategies, undefined)).toBeTruthy();
    expect(containsSqlModelOrDirective(dataSourceStrategies, [])).toBeTruthy();
    expect(containsSqlModelOrDirective(emptyProvider.dataSourceStrategies, sqlDirectiveDataSourceStrategies)).toBeTruthy();
    expect(containsSqlModelOrDirective(ddbDataSourceStrategies, sqlDirectiveDataSourceStrategies)).toBeTruthy();
  });

  it('containsSqlModelOrDirective should return false if there are no sql models', () => {
    expect(containsSqlModelOrDirective(ddbDataSourceStrategies, undefined)).toBeFalsy();
    expect(containsSqlModelOrDirective(ddbDataSourceStrategies, [])).toBeFalsy();
    expect(containsSqlModelOrDirective(emptyProvider.dataSourceStrategies)).toBeFalsy();
  });
});

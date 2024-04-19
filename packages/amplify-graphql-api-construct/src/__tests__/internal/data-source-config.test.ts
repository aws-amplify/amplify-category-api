import {
  constructCustomSqlDataSourceStrategies,
  getDataSourceStrategiesProvider,
  validateDataSourceStrategy,
} from '../../internal/data-source-config';
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

  it('validateDataSourceStrategy passes when secretArn is valid', () => {
    expect(() =>
      validateDataSourceStrategy({
        name: 'mysqlStrategy',
        dbType: 'MYSQL',
        dbConnectionConfig: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:12345678910:secret:fakearn-abdc',
          port: 1234,
          databaseName: '',
          hostname: '',
        },
      }),
    ).not.toThrow();
  });

  describe('validateDataSourceStrategy fails when secretArn is not a valid arn', () => {
    it('not arn format', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            secretArn: 'notaarn',
            port: 1234,
            databaseName: '',
            hostname: '',
          },
        }),
      ).toThrow('Invalid data source strategy "mysqlStrategy". The value of secretArn is not a valid Secrets Manager ARN.');
    });

    it('not secrets manager service', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            secretArn: 'arn:aws:fakeservice:us-west-2:12345678910:secret:fakearn-abdc',
            port: 1234,
            databaseName: '',
            hostname: '',
          },
        }),
      ).toThrow('Invalid data source strategy "mysqlStrategy". The value of secretArn is not a valid Secrets Manager ARN.');
    });

    it('not secret resource', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:12345678910:notasecret:fakearn-abdc',
            port: 1234,
            databaseName: '',
            hostname: '',
          },
        }),
      ).toThrow('Invalid data source strategy "mysqlStrategy". The value of secretArn is not a valid Secrets Manager ARN.');
    });
  });

  it('validateDataSourceStrategy passes when keyArn is valid', () => {
    expect(() =>
      validateDataSourceStrategy({
        name: 'mysqlStrategy',
        dbType: 'MYSQL',
        dbConnectionConfig: {
          secretArn: 'arn:aws:secretsmanager:us-west-2:12345678910:secret:fakearn-abdc',
          // random uuid, not a real arn
          keyArn: 'arn:aws:kms:us-west-2:12345678910:key/fcb8b8b7-403b-4803-a1b6-a84c45501129',
          port: 1234,
          databaseName: '',
          hostname: '',
        },
      }),
    ).not.toThrow();
  });

  describe('validateDataSourceStrategy fails when keyArn is not a valid arn', () => {
    it('not arn format', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:12345678910:secret:fakearn-abdc',
            keyArn: 'notaarn',
            port: 1234,
            databaseName: '',
            hostname: '',
          },
        }),
      ).toThrow('Invalid data source strategy "mysqlStrategy". The value of keyArn is not a valid KMS ARN.');
    });

    it('not kms service', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:12345678910:secret:fakearn-abdc',
            // random uuid, not a real arn
            keyArn: 'arn:aws:otherservice:us-west-2:12345678910:key/fcb8b8b7-403b-4803-a1b6-a84c45501129',
            port: 1234,
            databaseName: '',
            hostname: '',
          },
        }),
      ).toThrow('Invalid data source strategy "mysqlStrategy". The value of keyArn is not a valid KMS ARN.');
    });

    it('not key resource', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            secretArn: 'arn:aws:secretsmanager:us-west-2:12345678910:secret:fakearn-abdc',
            // random uuid, not a real arn
            keyArn: 'arn:aws:kms:us-west-2:12345678910:notkey/fcb8b8b7-403b-4803-a1b6-a84c45501129',
            port: 1234,
            databaseName: '',
            hostname: '',
          },
        }),
      ).toThrow('Invalid data source strategy "mysqlStrategy". The value of keyArn is not a valid KMS ARN.');
    });

    it('validateDataSourceStrategy passes when connection string SSM Path is valid', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            connectionUriSsmPath: '/test/connectionUri',
          },
        }),
      ).not.toThrow();
    });

    it('validateDataSourceStrategy fails when connection string SSM Path is not valid', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            connectionUriSsmPath: 'connectionUriPath',
          },
        }),
      ).toThrow(
        'Invalid data source strategy "mysqlStrategy". Following SSM paths must start with \'/\' in dbConnectionConfig: connectionUriPath.',
      );
    });

    it('validateDataSourceStrategy passes when multiple valid connection string SSM Paths are passed', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            connectionUriSsmPath: ['/test/connectionUri/1', '/test/connectionUri/2'],
          },
        }),
      ).not.toThrow();
    });

    it('validateDataSourceStrategy fails when any of the connection string SSM Paths is not valid', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            connectionUriSsmPath: ['/test/connectionUri/1', 'connectionUriPath'],
          },
        }),
      ).toThrow(
        'Invalid data source strategy "mysqlStrategy". Following SSM paths must start with \'/\' in dbConnectionConfig: connectionUriPath.',
      );
    });

    it('validateDataSourceStrategy fails the connection string SSM Path is an empty array', () => {
      expect(() =>
        validateDataSourceStrategy({
          name: 'mysqlStrategy',
          dbType: 'MYSQL',
          dbConnectionConfig: {
            connectionUriSsmPath: [],
          },
        }),
      ).toThrow('Invalid data source strategy "mysqlStrategy". connectionUriSsmPath must be a string or non-empty array.');
    });
  });
});

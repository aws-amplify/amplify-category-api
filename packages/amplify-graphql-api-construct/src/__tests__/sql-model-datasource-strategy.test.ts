/* eslint-disable max-classes-per-file */
import { isSQLLambdaModelDataSourceStrategy, isSqlModelDataSourceDbConnectionConfig } from '../sql-model-datasource-strategy';

/** Mock to test that isSqlLambdaModelDataSourceStrategy recognizes function types */
class MockFunctionStrategy {
  dbType: string;
  name: string;
  dbConnectionConfig: any;

  constructor() {
    this.dbType = 'MYSQL';
    this.name = 'test';
    this.dbConnectionConfig = new MockConnectionConfig('path');
  }
}

class MockConnectionConfig {
  connectionUriSsmPath: string | string[] | undefined;
  constructor(path: string | string[] | undefined) {
    this.connectionUriSsmPath = path;
  }
}

describe('sql-model-datasource-strategy utilities', () => {
  describe('isSQLLambdaModelDataSourceStrategy', () => {
    test.each([
      {
        label: 'accepts an object type',
        expected: true,
        candidateObject: {
          dbType: 'MYSQL',
          name: 'test',
          dbConnectionConfig: {
            connectionUriSsmPath: '/path',
          },
        },
      },

      {
        label: 'accepts a postgres database type',
        expected: true,
        candidateObject: {
          dbType: 'POSTGRES',
          name: 'test',
          dbConnectionConfig: {
            connectionUriSsmPath: '/path',
          },
        },
      },

      {
        label: 'accepts a function type',
        expected: true,
        candidateObject: new MockFunctionStrategy(),
      },

      {
        label: 'rejects an unknown db type',
        expected: false,
        candidateObject: {
          dbType: 'ZZZZZ',
          name: 'test',
          dbConnectionConfig: {
            connectionUriSsmPath: '/path',
          },
        },
      },

      {
        label: 'rejects an unknown connection config',
        expected: false,
        candidateObject: {
          dbType: 'POSTGRES',
          name: 'test',
          dbConnectionConfig: {
            foo: false,
          },
        },
      },

      {
        label: 'rejects a missing name',
        expected: false,
        candidateObject: {
          dbType: 'POSTGRES',
          dbConnectionConfig: {
            connectionUriSsmPath: '/path',
          },
        },
      },

      {
        label: 'rejects a non-object, non-function value',
        expected: false,
        candidateObject: 123,
      },

      {
        label: 'rejects an undefined value',
        expected: false,
        candidateObject: 123,
      },
    ])('$label', ({ candidateObject, expected }) => {
      expect(isSQLLambdaModelDataSourceStrategy(candidateObject)).toEqual(expected);
    });
  });

  describe('isSqlModelDataSourceDbConnectionConfig', () => {
    test.each([
      {
        label: 'accepts an SSM connection URI config with a single value',
        expected: true,
        candidateObject: {
          connectionUriSsmPath: '/path',
        },
      },

      {
        label: 'accepts an SSM connection URI config with an array value',
        expected: true,
        candidateObject: {
          connectionUriSsmPath: ['/path1', '/path2'],
        },
      },

      {
        label: 'accepts a function with a single value',
        expected: true,
        candidateObject: new MockConnectionConfig('/path1'),
      },

      {
        label: 'accepts a function with an array value',
        expected: true,
        candidateObject: new MockConnectionConfig(['/path1', '/path2']),
      },

      {
        label: 'rejects a function with a missing value',
        expected: false,
        candidateObject: new MockConnectionConfig(undefined),
      },

      {
        label: 'rejects a non-object, non-function value',
        expected: false,
        candidateObject: 123,
      },

      {
        label: 'rejects an undefined value',
        expected: false,
        candidateObject: 123,
      },

      {
        label: 'accepts an SSM individual parameter config',
        expected: true,
        candidateObject: {
          hostnameSsmPath: '/hostnameSsmPath',
          portSsmPath: '/portSsmPath',
          usernameSsmPath: '/usernameSsmPath',
          passwordSsmPath: '/passwordSsmPath',
          databaseNameSsmPath: '/databaseNameSsmPath',
        },
      },

      {
        label: 'rejects an SSM individual parameter config with a missing value',
        expected: false,
        candidateObject: {
          portSsmPath: '/portSsmPath',
          usernameSsmPath: '/usernameSsmPath',
          passwordSsmPath: '/passwordSsmPath',
          databaseNameSsmPath: '/databaseNameSsmPath',
        },
      },

      {
        label: 'accepts an secrets manager config',
        expected: true,
        candidateObject: {
          secretArn: 'arn:aws:secretsmanager:::secret',
          port: 1234,
          databaseName: 'databaseName',
          hostname: 'hostname',
        },
      },
    ])('$label', ({ candidateObject, expected }) => {
      expect(isSqlModelDataSourceDbConnectionConfig(candidateObject)).toEqual(expected);
    });
  });
});

import { DynamoDBProvisionStrategy, SQLLambdaModelProvisionStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { parseDataSourceConfig } from '../../internal/data-source-config';
import { ModelDataSourceStrategy } from '../../types';

describe('datasource config', () => {
  it('should parse the datasource config correctly', () => {
    const input: Record<string, ModelDataSourceStrategy> = {
      Todo: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'DEFAULT',
      },
      Author: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
      Post: {
        name: 'mysqlTable',
        dbType: 'MYSQL',
        dbConnectionConfig: {
          hostnameSsmPath: 'hostnameSsmPath',
          portSsmPath: 'portSsmPath',
          usernameSsmPath: 'usernameSsmPath',
          passwordSsmPath: 'passwordSsmPath',
          databaseNameSsmPath: 'databaseNameSsmPath',
        },
      },
      Comment: {
        name: 'pgTable',
        dbType: 'POSTGRES',
        dbConnectionConfig: {
          hostnameSsmPath: 'hostnameSsmPath',
          portSsmPath: 'portSsmPath',
          usernameSsmPath: 'usernameSsmPath',
          passwordSsmPath: 'passwordSsmPath',
          databaseNameSsmPath: 'databaseNameSsmPath',
        },
      },
    };
    const datasourceConfig = parseDataSourceConfig(input);
    expect(datasourceConfig).toEqual({
      modelToDatasourceMap: new Map([
        [
          'Todo',
          {
            dbType: 'DDB',
            provisionDB: true,
            provisionStrategy: DynamoDBProvisionStrategy.DEFAULT,
          },
        ],
        [
          'Author',
          {
            dbType: 'DDB',
            provisionDB: true,
            provisionStrategy: DynamoDBProvisionStrategy.AMPLIFY_TABLE,
          },
        ],
        [
          'Post',
          {
            dbType: 'MySQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        ],
        [
          'Comment',
          {
            dbType: 'Postgres',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        ],
      ]),
    });
  });
});

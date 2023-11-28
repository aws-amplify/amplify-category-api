import { DynamoDBProvisionStrategy, SQLLambdaModelProvisionStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { parseDataSourceConfig } from '../../internal/data-source-config';
import { ModelDataSourceStrategy } from '../../model-datasource-strategy';

describe('datasource config', () => {
  it('should parse the datasource config correctly', () => {
    const input: Record<string, ModelDataSourceStrategy> = {
      Todo: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'DEFAULT',
      },
      Author: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
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
            dbType: 'DYNAMODB',
            provisionDB: true,
            provisionStrategy: DynamoDBProvisionStrategy.DEFAULT,
          },
        ],
        [
          'Author',
          {
            dbType: 'DYNAMODB',
            provisionDB: true,
            provisionStrategy: DynamoDBProvisionStrategy.AMPLIFY_TABLE,
          },
        ],
        [
          'Post',
          {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        ],
        [
          'Comment',
          {
            dbType: 'POSTGRES',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        ],
      ]),
    });
  });
});

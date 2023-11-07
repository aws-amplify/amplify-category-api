import { DynamoDBProvisionStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { parseDataSourceConfig } from '../../internal/data-source-config';
import { ModelDataSourceDefinition } from '../../types';

describe('datasource config', () => {
  it('should parse the datasource config correctly', () => {
    const input: Record<string, ModelDataSourceDefinition> = {
      Todo: {
        name: 'defaultDDB',
        strategy: {
          dbType: 'DYNAMODB',
          provisionStrategy: 'DEFAULT',
        },
      },
      Author: {
        name: 'customDDB',
        strategy: {
          dbType: 'DYNAMODB',
          provisionStrategy: 'AMPLIFY_TABLE',
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
      ]),
    });
  });
});

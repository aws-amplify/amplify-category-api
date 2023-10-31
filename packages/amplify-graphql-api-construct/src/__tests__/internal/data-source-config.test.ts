import { DynamoDBProvisionStrategyType } from '@aws-amplify/graphql-transformer-interfaces';
import { parseDataSourceConfig } from '../../internal/data-source-config';
import { DataSourceProvisionConfig } from '../../types';

describe('datasource config', () => {
  it('should parse the datasource config correctly', () => {
    const input: DataSourceProvisionConfig = {
      project: {
        name: 'defaultDDB',
        strategy: {
          dbType: 'DYNAMODB',
          provisionStrategy: 'DEFAULT',
        },
      },
      models: {
        Todo: {
          name: 'customDDB',
          strategy: {
            dbType: 'DYNAMODB',
            provisionStrategy: 'AMPLIFY_TABLE',
          },
        },
      },
    };
    const datasourceConfig = parseDataSourceConfig(input);
    expect(datasourceConfig).toEqual({
      datasourceProvisionConfig: {
        project: {
          dbType: 'DDB',
          provisionStrategy: DynamoDBProvisionStrategyType.DEFAULT,
        },
        models: {
          Todo: {
            dbType: 'DDB',
            provisionStrategy: DynamoDBProvisionStrategyType.AMPLIFY_TABLE,
          },
        },
      },
    });
  });
});

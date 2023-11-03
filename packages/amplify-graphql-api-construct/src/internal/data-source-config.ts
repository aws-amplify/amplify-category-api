import { ModelDataSourceDefinition } from '../types';
import { DataSourceType, DynamoDBProvisionStrategy } from '@aws-amplify/graphql-transformer-interfaces';

type DataSourceConfig = {
  modelToDatasourceMap: Map<string, DataSourceType>;
};
const convertToDataSourceType = (modelDataSourceDefinition: ModelDataSourceDefinition): DataSourceType => {
  const { strategy } = modelDataSourceDefinition;
  if (strategy.dbType === 'DYNAMODB') {
    switch (strategy.provisionStrategy) {
      case 'DEFAULT':
        return {
          dbType: 'DDB',
          provisionDB: true,
          provisionStrategy: DynamoDBProvisionStrategy.DEFAULT,
        };
      case 'AMPLIFY_TABLE':
        return {
          dbType: 'DDB',
          provisionDB: true,
          provisionStrategy: DynamoDBProvisionStrategy.AMPLIFY_TABLE,
        };
      default:
        throw new Error(`Encountered unexpected provision strategy: ${(strategy as any).provisionStrategy}`);
    }
  }
  throw new Error(`Encountered unexpected database type ${strategy.dbType}`);
};

export const parseDataSourceConfig = (dataSourceDefinitionMap: Record<string, ModelDataSourceDefinition>): DataSourceConfig => {
  const modelToDatasourceMap = new Map<string, DataSourceType>();
  for (const [key, value] of Object.entries(dataSourceDefinitionMap)) {
    const dataSourceType = convertToDataSourceType(value);
    modelToDatasourceMap.set(key, dataSourceType);
  }
  return {
    modelToDatasourceMap,
  };
};

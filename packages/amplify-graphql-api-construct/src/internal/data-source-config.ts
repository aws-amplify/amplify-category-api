import {
  DatasourceProvisionConfig,
  DatasourceProvisionStrategy,
  DynamoDBProvisionStrategyType,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceProvisoinConfig, DataSourceProvisoinStrategy } from '../types';
import {} from '@aws-amplify/graphql-transformer-interfaces/src';

type DataSourceConfig = {
  datasourceProvisionConfig: DatasourceProvisionConfig;
};
const convertToProvisionStrategy = (provisionStrategy: DataSourceProvisoinStrategy): DatasourceProvisionStrategy => {
  switch (provisionStrategy.provisionStrategy) {
    case 'DEFAULT':
      return {
        dbType: 'DDB',
        provisionStrategy: DynamoDBProvisionStrategyType.DEFAULT,
      };
    case 'AMPLIFY_TABLE':
      return {
        dbType: 'DDB',
        provisionStrategy: DynamoDBProvisionStrategyType.AMPLIFY_TABLE,
      };
    default:
      throw new Error(`Encountered unexpected provision strategy: ${(provisionStrategy as any).provisionStrategy}`);
  }
};

export const parseDataSourceConfig = (dataSourceProvisionStrategy: DataSourceProvisoinConfig | undefined): DataSourceConfig | undefined => {
  if (!dataSourceProvisionStrategy) {
    return undefined;
  }
  const { project, models } = dataSourceProvisionStrategy;
  const result = {
    project: project && convertToProvisionStrategy(project),
    models:
      models &&
      Object.fromEntries(Object.entries(models).map(([modelName, strategy]) => [modelName, convertToProvisionStrategy(strategy)])),
  } as DatasourceProvisionConfig;
  return result.models || result.project ? { datasourceProvisionConfig: result } : undefined;
};

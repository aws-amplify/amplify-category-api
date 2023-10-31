import {
  DatasourceProvisionConfig,
  DatasourceProvisionStrategy,
  DynamoDBProvisionStrategyType,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DataSourceProvisionConfig, ModelDataSourceDefinitionStrategy } from '../types';

type DataSourceConfig = {
  datasourceProvisionConfig: DatasourceProvisionConfig;
};
const convertToProvisionStrategy = (provisionStrategy: ModelDataSourceDefinitionStrategy): DatasourceProvisionStrategy | undefined => {
  if (provisionStrategy.dbType === 'DYNAMODB') {
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
  }
  return undefined;
};

export const parseDataSourceConfig = (dataSourceProvisionStrategy: DataSourceProvisionConfig | undefined): DataSourceConfig | undefined => {
  if (!dataSourceProvisionStrategy) {
    return undefined;
  }
  const { project, models } = dataSourceProvisionStrategy;
  const result = {
    project: project?.strategy && convertToProvisionStrategy(project.strategy),
    models:
      models &&
      Object.fromEntries(
        Object.entries(models).map(([modelName, strategyConfig]) => [modelName, convertToProvisionStrategy(strategyConfig.strategy)]),
      ),
  } as DatasourceProvisionConfig;
  return result.models || result.project ? { datasourceProvisionConfig: result } : undefined;
};

import {
  DataSourceType,
  DynamoDBProvisionStrategy,
  SQLDBType,
  SQLLambdaModelProvisionStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import { ModelDataSourceDefinition } from '../types';

type DataSourceConfig = {
  modelToDatasourceMap: Map<string, DataSourceType>;
};

// TODO: Do away with this after we normalize database types throughout the internals
const convertSQLDBType = (definitionDBType: 'MYSQL' | 'POSTGRES'): SQLDBType => (definitionDBType === 'MYSQL' ? 'MySQL' : 'Postgres');

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
  } else if (strategy.dbType === 'MYSQL' || strategy.dbType === 'POSTGRES') {
    return {
      dbType: convertSQLDBType(strategy.dbType),
      provisionDB: false,
      provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
    };
  }
  throw new Error(`Encountered unexpected database type ${strategy.dbType}`);
};

/**
 * An internal helper to convert from a map of model-to-ModelDataSourceDefinitions to the map of model-to-DataSourceTypes that internal
 * transform processing requires. TODO: We can remove this once we refactor the internals to use ModelDataSourceDefinitions natively.
 */
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

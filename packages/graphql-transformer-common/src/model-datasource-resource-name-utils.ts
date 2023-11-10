import { ResourceConstants } from './ResourceConstants';
import { PartialSQLLambdaModelDataSourceStrategy, SQLLambdaModelDataSourceStrategy } from './model-datasource-strategy-types';

export const getSqlResourceNameForStrategy = (
  prefix: string,
  strategy: SQLLambdaModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy,
): string => getSqlResourceNameForStrategyName(prefix, strategy.name);

export const getSqlResourceNameForStrategyName = (prefix: string, strategyName: string): string => `${prefix}${strategyName}`;

export const getSqlLambdaFunctionNameForStrategy = (
  strategy: SQLLambdaModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy,
): string => getSqlResourceNameForStrategy(ResourceConstants.RESOURCES.SQLLambdaLogicalIDPrefix, strategy);

export const getSqlLambdaDataSourceNameForStrategy = (
  strategy: SQLLambdaModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy,
): string => getSqlResourceNameForStrategy(ResourceConstants.RESOURCES.SQLLambdaDataSourceLogicalIDPrefix, strategy);

export const getDynamoDbTableName = (typeName: string): string => `${typeName}${ResourceConstants.RESOURCES.DynamoDbTableDataSourceSuffix}`;

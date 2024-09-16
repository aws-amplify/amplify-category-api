import {
  AmplifyDynamoDbModelDataSourceStrategy,
  DataSourceStrategiesProvider,
  DefaultDynamoDbModelDataSourceStrategy,
  ModelDataSourceStrategy,
  ModelDataSourceStrategyDbType,
  ModelDataSourceStrategySqlDbType,
  SQLLambdaModelDataSourceStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DDB_DB_TYPE, ImportedRDSType, MYSQL_DB_TYPE, POSTGRES_DB_TYPE } from '../types';
import { isBuiltInGraphqlType } from './graphql-utils';
import { getResourceNamesForStrategy } from './resource-name';

/**
 * Return the data source name for a given `@model` Type name. The strategy for deriving a data source name differs depending on whether the
 * type's associated ModelDataSourceStrategy uses DynamoDB or SQL. DynamoDB data sources are named `<modelName>Table`, while SQL sources use
 * the resource constant of the SQL Lambda Data Source.
 *
 * Note: This utility is not suitable for deriving data source names for non-model types such as Query or Mutation custom SQL fields, HTTP
 * data sources, etc.
 */
export const getModelDataSourceNameForTypeName = (ctx: DataSourceStrategiesProvider, typeName: string): string => {
  let dataSourceName: string;
  const strategy = getModelDataSourceStrategy(ctx, typeName);
  if (isSqlStrategy(strategy)) {
    const resourceNames = getResourceNamesForStrategy(strategy);
    dataSourceName = resourceNames.sqlLambdaDataSource;
  } else {
    dataSourceName = `${typeName}Table`;
  }
  return dataSourceName;
};

/**
 * Map the database type that is set in the dataSourceStrategies to the engine represented by ImportedRDSType. This is used to generate
 * parameters for invoking the SQL Lambda.
 */
export const getImportedRDSTypeFromStrategyDbType = (dbType: ModelDataSourceStrategyDbType): ImportedRDSType => {
  switch (dbType) {
    case MYSQL_DB_TYPE:
      return ImportedRDSType.MYSQL;
    case POSTGRES_DB_TYPE:
      return ImportedRDSType.POSTGRESQL;
    default:
      throw new Error(`Unsupported RDS datasource type: ${dbType}`);
  }
};

/**
 * Get the datasource database type of the model.
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns datasource type
 */
export const getModelDataSourceStrategy = (ctx: DataSourceStrategiesProvider, typename: string): ModelDataSourceStrategy => {
  const strategy = ctx.dataSourceStrategies[typename];
  if (!strategy) {
    throw new Error(`Cannot find datasource type for model ${typename}`);
  }
  return strategy;
};

/**
 * Type predicate that returns true if `obj` is a AmplifyDynamoDbModelDataSourceStrategy
 */
export const isAmplifyDynamoDbModelDataSourceStrategy = (
  strategy: ModelDataSourceStrategy,
): strategy is AmplifyDynamoDbModelDataSourceStrategy => {
  return (
    isDynamoDbType(strategy.dbType) &&
    typeof (strategy as any)['provisionStrategy'] === 'string' &&
    (strategy as any)['provisionStrategy'] === 'AMPLIFY_TABLE'
  );
};

/**
 * Type predicate that returns true if `obj` is a DefaultDynamoDbModelDataSourceStrategy
 */
export const isDefaultDynamoDbModelDataSourceStrategy = (
  strategy: ModelDataSourceStrategy,
): strategy is DefaultDynamoDbModelDataSourceStrategy => {
  return (
    isDynamoDbType(strategy.dbType) &&
    typeof (strategy as any)['provisionStrategy'] === 'string' &&
    (strategy as any)['provisionStrategy'] === 'DEFAULT'
  );
};

/**
 * Checks if the given model is a DynamoDB model
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns boolean
 */
export const isDynamoDbModel = (ctx: DataSourceStrategiesProvider, typename: string): boolean => {
  if (isBuiltInGraphqlType(typename)) {
    return false;
  }
  const modelDataSourceType = getModelDataSourceStrategy(ctx, typename);
  return isDynamoDbType(modelDataSourceType.dbType);
};

/**
 * Type predicate that returns true if `dbType` is the DynamoDB database type
 */
export const isDynamoDbType = (dbType: ModelDataSourceStrategyDbType): dbType is 'DYNAMODB' => {
  return dbType === 'DYNAMODB';
};

/**
 * Returns true if the given type is a model--that is, if the `typename` is in the context's dataSourceStrategies map. Unlike
 * `isDynamoDbModel` and `isSqlModel`, this method will not throw if the given typename is not in the context's dataSourceStrategies, since
 * the purpose of this method is to safely check for the type's existence in that structure.
 */
export const isModelType = (ctx: DataSourceStrategiesProvider, typename: string): boolean => {
  const strategy = ctx.dataSourceStrategies[typename];
  if (!strategy) {
    return false;
  }
  return true;
};

/**
 * Type predicate that returns true if `dbType` is a supported SQL database type
 */
export const isSqlDbType = (dbType: ModelDataSourceStrategyDbType): dbType is ModelDataSourceStrategySqlDbType => {
  return ([MYSQL_DB_TYPE, POSTGRES_DB_TYPE] as string[]).includes(dbType as string);
};

/**
 * Checks if the given model is a SQL model
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns boolean
 */
export const isSqlModel = (ctx: DataSourceStrategiesProvider, typename: string): boolean => {
  if (isBuiltInGraphqlType(typename)) {
    return false;
  }
  const modelDataSourceType = getModelDataSourceStrategy(ctx, typename);
  return isSqlDbType(modelDataSourceType.dbType);
};

/**
 * Checks if the given model is a SQL model
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns boolean
 */
export const isPostgresModel = (ctx: DataSourceStrategiesProvider, typename: string): boolean => {
  if (isBuiltInGraphqlType(typename)) {
    return false;
  }
  const modelDataSourceType = getModelDataSourceStrategy(ctx, typename);
  return isPostgresDbType(modelDataSourceType.dbType);
};

/**
 * Type predicate that returns true if `dbType` is a supported SQL database type
 */
export const isPostgresDbType = (dbType: ModelDataSourceStrategyDbType): dbType is ModelDataSourceStrategySqlDbType => {
  return dbType === POSTGRES_DB_TYPE;
};

/**
 * Type predicate that returns true if `obj` is a SQLLambdaModelDataSourceStrategy
 */
export const isSqlStrategy = (strategy: ModelDataSourceStrategy): strategy is SQLLambdaModelDataSourceStrategy => {
  return (
    isSqlDbType(strategy.dbType) && typeof (strategy as any).name === 'string' && typeof (strategy as any).dbConnectionConfig === 'object'
  );
};

/**
 * Provides the data source strategy for a given model
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns ModelDataSourceStrategyDbType
 */
export const getStrategyDbTypeFromModel = (ctx: DataSourceStrategiesProvider, typename: string): ModelDataSourceStrategyDbType => {
  if (isBuiltInGraphqlType(typename)) {
    return DDB_DB_TYPE;
  }
  return getModelDataSourceStrategy(ctx, typename).dbType;
};

/**
 * Normalize known variants of a database type to its canonical representation. E.g.:
 *
 * ```ts
 * normalizeDbType('DDB') // => DDB_DB_TYPE
 * normalizeDbType('dynamodb') // => DDB_DB_TYPE
 * normalizeDbType('MySQL') // => MYSQL_DB_TYPE
 * normalizeDbType('PostgreSQL') // => POSTGRES_DB_TYPE
 * ```
 * @param candidate the type string to normalize
 * @returns the canonical database type
 * @throws if the type is not recognized
 */
export const normalizeDbType = (candidate: string): ModelDataSourceStrategyDbType => {
  switch (candidate.toLowerCase()) {
    case 'mysql':
      return MYSQL_DB_TYPE;
    case 'ddb':
    case 'dynamodb':
    case 'dynamo_db':
      return DDB_DB_TYPE;
    case 'pg':
    case 'postgres':
    case 'postgresql':
      return POSTGRES_DB_TYPE;
    default:
      throw new Error(`Unknown database type ${candidate}`);
  }
};

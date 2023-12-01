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

// Exported but possibly unused
// TODO: Revisit these after the combine feature work. If they're not used, remove them

/**
 * Type predicate that returns true if `obj` is one of the known DynamoDB-based strategies
 */
export const isDynamoDbStrategy = (
  strategy: ModelDataSourceStrategy,
): strategy is AmplifyDynamoDbModelDataSourceStrategy | DefaultDynamoDbModelDataSourceStrategy => {
  return isDefaultDynamoDbModelDataSourceStrategy(strategy) || isAmplifyDynamoDbModelDataSourceStrategy(strategy);
};

// Exported utils

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
 * Type predicate that returns true if `obj` is a SQLLambdaModelDataSourceStrategy
 */
export const isSqlStrategy = (strategy: ModelDataSourceStrategy): strategy is SQLLambdaModelDataSourceStrategy => {
  return (
    isSqlDbType(strategy.dbType) && typeof (strategy as any).name === 'string' && typeof (strategy as any).dbConnectionConfig === 'object'
  );
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

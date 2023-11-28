import {
  AmplifyDynamoDbModelDataSourceStrategy,
  DataSourceType,
  DefaultDynamoDbModelDataSourceStrategy,
  ModelDataSourceStrategy,
  ModelDataSourceStrategyDbType,
  ModelDataSourceStrategySqlDbType,
  SQLLambdaModelDataSourceStrategy,
  SQLLambdaModelProvisionStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  DDB_AMPLIFY_MANAGED_DATASOURCE_TYPE,
  DDB_DB_TYPE,
  DDB_DEFAULT_DATASOURCE_TYPE,
  MYSQL_DB_TYPE,
  POSTGRES_DB_TYPE,
} from '../types/model-datasource-strategies';

export const dataSourceStrategyToDataSourceType = (dataSourceStrategy: ModelDataSourceStrategy): DataSourceType => {
  if (dataSourceStrategy.dbType === 'DYNAMODB') {
    switch (dataSourceStrategy.provisionStrategy) {
      case 'DEFAULT':
        return DDB_DEFAULT_DATASOURCE_TYPE;
      case 'AMPLIFY_TABLE':
        return DDB_AMPLIFY_MANAGED_DATASOURCE_TYPE;
      default:
        throw new Error(`Encountered unexpected provision strategy: ${(dataSourceStrategy as any).provisionStrategy}`);
    }
  } else if (dataSourceStrategy.dbType === 'MYSQL' || dataSourceStrategy.dbType === 'POSTGRES') {
    return {
      dbType: dataSourceStrategy.dbType,
      provisionDB: false,
      provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
    };
  }
  throw new Error(`Encountered unexpected database type ${dataSourceStrategy.dbType}`);
};

/**
 * Type predicate that returns true if `obj` is one of the known DynamoDB-based strategies
 */
export const isDynamoDbStrategy = (
  strategy: ModelDataSourceStrategy,
): strategy is AmplifyDynamoDbModelDataSourceStrategy | DefaultDynamoDbModelDataSourceStrategy => {
  return isDefaultDynamoDbModelDataSourceStrategy(strategy) || isAmplifyDynamoDbModelDataSourceStrategy(strategy);
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
 * Type predicate that returns true if `dbType` is the DynamoDB database type
 */
export const isDynamoDbType = (dbType: ModelDataSourceStrategyDbType): dbType is 'DYNAMODB' => {
  return dbType === 'DYNAMODB';
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
 * Type predicate that returns true if `dbType` is a supported SQL database type
 */
export const isSqlDbType = (dbType: ModelDataSourceStrategyDbType): dbType is ModelDataSourceStrategySqlDbType => {
  return ([MYSQL_DB_TYPE, POSTGRES_DB_TYPE] as string[]).includes(dbType as string);
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

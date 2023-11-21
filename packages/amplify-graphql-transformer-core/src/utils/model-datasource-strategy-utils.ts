import {
  AmplifyDynamoDbModelDataSourceStrategy,
  DBType,
  DataSourceType,
  DefaultDynamoDbModelDataSourceStrategy,
  DynamoDBProvisionStrategy,
  ModelDataSourceStrategy,
  ModelDataSourceStrategyDbType,
  SQLDBType,
  SQLLambdaModelDataSourceStrategy,
  SQLLambdaModelProvisionStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DDB_DB_TYPE, MYSQL_DB_TYPE, POSTGRES_DB_TYPE } from '../types/import-appsync-api-types';

export const dataSourceStrategyToDataSourceType = (dataSourceStrategy: ModelDataSourceStrategy): DataSourceType => {
  if (dataSourceStrategy.dbType === 'DYNAMODB') {
    switch (dataSourceStrategy.provisionStrategy) {
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
        throw new Error(`Encountered unexpected provision strategy: ${(dataSourceStrategy as any).provisionStrategy}`);
    }
  } else if (dataSourceStrategy.dbType === 'MYSQL' || dataSourceStrategy.dbType === 'POSTGRES') {
    return {
      dbType: convertSQLDBType(dataSourceStrategy.dbType),
      provisionDB: false,
      provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
    };
  }
  throw new Error(`Encountered unexpected database type ${dataSourceStrategy.dbType}`);
};

// TODO: Do away with this after we normalize database types throughout the internals
export const convertSQLDBType = (definitionDBType: 'MYSQL' | 'POSTGRES'): SQLDBType =>
  definitionDBType === 'MYSQL' ? 'MySQL' : 'Postgres';

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
    isDynamoModelDataSourceDbType(strategy.dbType) &&
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
    isDynamoModelDataSourceDbType(strategy.dbType) &&
    typeof (strategy as any)['provisionStrategy'] === 'string' &&
    (strategy as any)['provisionStrategy'] === 'AMPLIFY_TABLE'
  );
};

/**
 * Type predicate that returns true if `dbType` is the DynamoDB database type
 *
 * TODO: Normalize this along the DBType -> ModelDataSourceStrategyDbType refactor
 * @param dbType the candidate dbType to check
 * @returns true if dbType is the DynamoDB database type
 */
export const isDynamoModelDataSourceDbType = (dbType: ModelDataSourceStrategyDbType): dbType is 'DYNAMODB' => {
  return dbType === 'DYNAMODB';
};

/**
 * Type predicate that returns true if `obj` is a SQLLambdaModelDataSourceStrategy
 */
export const isSqlStrategy = (strategy: ModelDataSourceStrategy): strategy is SQLLambdaModelDataSourceStrategy => {
  return (
    isSqlModelDataSourceDbType(strategy.dbType) &&
    typeof (strategy as any).name === 'string' &&
    typeof (strategy as any).dbConnectionConfig === 'object'
  );
};

/**
 * Type predicate that returns true if `dbType` is a supported SQL database type
 *
 * TODO: Normalize this along the DBType -> ModelDataSourceStrategyDbType refactor
 * @param dbType the candidate dbType to check
 * @returns true if dbType is one of the supported SQL engines
 */
export const isSqlModelDataSourceDbType = (dbType: ModelDataSourceStrategyDbType): dbType is 'MYSQL' | 'POSTGRES' => {
  const validDbTypes: ModelDataSourceStrategyDbType[] = ['MYSQL', 'POSTGRES'];
  return validDbTypes.includes(dbType);
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
export const normalizeDbType = (candidate: string): DBType => {
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

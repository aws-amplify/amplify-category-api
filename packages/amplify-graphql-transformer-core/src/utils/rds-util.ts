import path from 'path';
import _ from 'lodash';
import { parse, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { DataSourceStrategiesProvider, DataSourceType, ModelDataSourceStrategyDbType } from '@aws-amplify/graphql-transformer-interfaces';
import { MYSQL_DB_TYPE, POSTGRES_DB_TYPE } from '../types';
import { ImportedRDSType } from '../types';
import { APICategory } from './api-category';
import { isDynamoDbType, isSqlDbType } from './model-datasource-strategy-utils';
import { isBuiltInGraphqlType } from './graphql-utils';

const getParameterNameForDBSecret = (secret: string, secretsKey: string): string => {
  return `${secretsKey}_${secret}`;
};

/* This adheres to the following convention:
  /amplify/<appId>/<envName>/AMPLIFY_${categoryName}${resourceName}${paramName}
  where paramName is secretsKey_<secretName>
*/
export const getParameterStoreSecretPath = (
  secret: string,
  secretsKey: string,
  apiName: string,
  environmentName: string,
  appId: string,
): string => {
  if (_.isEmpty(appId)) {
    throw new Error('Unable to read the App ID');
  }
  const categoryName = APICategory;
  const paramName = getParameterNameForDBSecret(secret, secretsKey);

  if (!environmentName) {
    throw new Error('Unable to create RDS secret path, environment not found/defined');
  }
  return path.posix.join('/amplify', appId, environmentName, `AMPLIFY_${categoryName}${apiName}${paramName}`);
};

/**
 * Get the datasource database type of the model.
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns datasource type
 */
export const getModelDataSourceType = (ctx: DataSourceStrategiesProvider, typename: string): ModelDataSourceStrategyDbType => {
  const config = ctx.modelToDatasourceMap.get(typename);
  if (!config) {
    throw new Error(`Cannot find datasource type for model ${typename}`);
  }
  return config.dbType;
};

/**
 * Checks if the given model is a DynamoDB model
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns boolean
 */
export const isDynamoDBModel = (ctx: DataSourceStrategiesProvider, typename: string): boolean => {
  if (isBuiltInGraphqlType(typename)) {
    return false;
  }
  const modelDataSourceType = getModelDataSourceType(ctx, typename);
  return isDynamoDbType(modelDataSourceType);
};

/**
 * Checks if the given model is a RDS model
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns boolean
 */
export const isSqlModel = (ctx: DataSourceStrategiesProvider, typename: string): boolean => {
  if (isBuiltInGraphqlType(typename)) {
    return false;
  }
  const modelDataSourceType = getModelDataSourceType(ctx, typename);
  return isSqlDbType(modelDataSourceType);
};

/**
 * Checks if the given Datasource is imported RDS datasource
 * @param dbInfo Datasource information
 * @returns boolean
 */
export const isImportedRDSType = (dbInfo: DataSourceType): boolean => {
  return isSqlDbType(dbInfo?.dbType) && !dbInfo?.provisionDB;
};

/**
 * Constructs a map of model names to datasource types for the specified schema. Used by the transformer to auto-generate a model mapping if
 * the customer has not provided an explicit one.
 * @param schema the annotated GraphQL schema
 * @param datasourceType the datasource type for each model to be associated with
 * @returns a map of model names to datasource types
 */
export const constructDataSourceMap = (schema: string, datasourceType: DataSourceType): Map<string, DataSourceType> => {
  const parsedSchema = parse(schema);
  const result = new Map<string, DataSourceType>();
  parsedSchema.definitions
    .filter((obj) => obj.kind === Kind.OBJECT_TYPE_DEFINITION && obj.directives?.some((dir) => dir.name.value === 'model'))
    .forEach((type) => {
      result.set((type as ObjectTypeDefinitionNode).name.value, datasourceType);
    });
  return result;
};

/**
 * Map the database type that is set in the modelToDatasourceMap to the engine represented by ImportedRDSType
 */
export const getEngineFromDBType = (dbType: ModelDataSourceStrategyDbType): ImportedRDSType => {
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
 * Returns the datasource type of the imported RDS models.
 * Throws an error if more than one datasource type is detected.
 *
 * TODO: Remove this during `combine` feature work; we will explicitly support more than one SQL data source
 * @param modelToDatasourceMap Array of datasource types
 * @returns datasource type
 */
export const getImportedRDSType = (modelToDatasourceMap: Map<string, DataSourceType>): ModelDataSourceStrategyDbType => {
  const datasourceMapValues = Array.from(modelToDatasourceMap?.values());
  const dbTypes = new Set(datasourceMapValues?.filter((value) => isImportedRDSType(value))?.map((value) => value?.dbType));
  if (dbTypes.size > 1) {
    throw new Error(`Multiple imported SQL datasource types ${Array.from(dbTypes)} are detected. Only one type is supported.`);
  }
  return dbTypes.values().next().value;
};

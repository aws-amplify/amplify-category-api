import path from 'path';
import _ from 'lodash';
import { parse, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DDB_DB_TYPE, MYSQL_DB_TYPE, ModelDatasourceType } from '../types';
import { DatasourceType } from '../config';
import { APICategory } from './api-category';

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
 * Get the datasource type of the model.
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns datasource type
 */
export const getModelDatasourceType = (ctx: TransformerContextProvider, typename: string): ModelDatasourceType => {
  const config = ctx.modelToDatasourceMap.get(typename);
  return config?.dbType || DDB_DB_TYPE;
};

/**
 * Checks if the given model is a DynamoDB model
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns boolean
 */
export const isDynamoDBModel = (ctx: TransformerContextProvider, typename: string): boolean => {
  return getModelDatasourceType(ctx, typename) === DDB_DB_TYPE;
};

/**
 * Checks if the given model is a RDS model
 * @param ctx Transformer Context
 * @param typename Model name
 * @returns boolean
 */
export const isRDSModel = (ctx: TransformerContextProvider, typename: string): boolean => {
  return getModelDatasourceType(ctx, typename) === MYSQL_DB_TYPE;
};

/**
 * Constructs a map of model names to datasource types for the specified schema. Used by the transformer to auto-generate a model mapping if
 * the customer has not provided an explicit one.
 * @param schema the annotated GraphQL schema
 * @param datasourceType the datasource type for each model to be associated with
 * @returns a map of model names to datasource types
 */
export const constructDataSourceMap = (schema: string, datasourceType: DatasourceType): Map<string, DatasourceType> => {
  const parsedSchema = parse(schema);
  const result = new Map<string, DatasourceType>();
  parsedSchema.definitions
    .filter((obj) => obj.kind === Kind.OBJECT_TYPE_DEFINITION && obj.directives?.some((dir) => dir.name.value === 'model'))
    .forEach((type) => {
      result.set((type as ObjectTypeDefinitionNode).name.value, datasourceType);
    });
  return result;
};

import { DefinitionNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, Kind, ObjectTypeDefinitionNode, parse } from 'graphql';
import {
  AmplifyDynamoDbModelDataSourceStrategy,
  CustomSqlDataSourceStrategy,
  DataSourceStrategiesProvider,
  DefaultDynamoDbModelDataSourceStrategy,
  ModelDataSourceDbType,
  ModelDataSourceSqlDbType,
  ModelDataSourceStrategy,
  PartialSQLLambdaModelDataSourceStrategy,
  SQLLambdaModelDataSourceStrategy,
} from './model-datasource-strategy-types';
import { DDB_DB_TYPE, MYSQL_DB_TYPE, POSTGRES_DB_TYPE } from './model-datasource-strategy-constants';

const MODEL_DIRECTIVE_NAME = 'model';
const SQL_DIRECTIVE_NAME = 'sql';

const isObjectTypeDefinitionNode = (obj: DefinitionNode): obj is ObjectTypeDefinitionNode => {
  return obj.kind === Kind.OBJECT_TYPE_DEFINITION || obj.kind === Kind.INTERFACE_TYPE_DEFINITION;
};

const isBuiltInTypeName = (typeName: string): typeName is 'Query' | 'Mutation' | 'Subscription' => {
  return typeName === 'Query' || typeName === 'Mutation' || typeName === 'Subscription';
};

const isQueryNode = (
  obj: DefinitionNode,
): obj is ObjectTypeDefinitionNode | (InterfaceTypeDefinitionNode & { name: { value: 'Query' } }) => {
  return isObjectTypeDefinitionNode(obj) && obj.name.value === 'Query';
};

const isMutationNode = (
  obj: DefinitionNode,
): obj is ObjectTypeDefinitionNode | (InterfaceTypeDefinitionNode & { name: { value: 'Mutation' } }) => {
  return isObjectTypeDefinitionNode(obj) && obj.name.value === 'Mutation';
};

/**
 * Return the datasource map for the input schema with the provided strategy
 * @param schema input schema
 * @param strategy input strategy
 * @returns a record of strategies per model
 */
export const constructDataSourceStrategies = <T extends ModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy>(
  schema: string,
  strategy: T,
): Record<string, T> => {
  const parsedSchema = parse(schema);
  const result: Record<string, T> = parsedSchema.definitions
    .filter((obj) => obj.kind === Kind.OBJECT_TYPE_DEFINITION && obj.directives?.some((dir) => dir.name.value === MODEL_DIRECTIVE_NAME))
    .reduce((acc, obj) => ({ ...acc, [(obj as ObjectTypeDefinitionNode).name.value]: strategy }), {});
  return result;
};

export const constructCustomSqlDataSourceStrategies = (
  schema: string,
  dataSourceStrategy: SQLLambdaModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy,
): CustomSqlDataSourceStrategy[] => {
  if (!isSqlStrategy(dataSourceStrategy)) {
    return [];
  }

  const parsedSchema = parse(schema);

  const queryNode = parsedSchema.definitions.find(isQueryNode);
  const mutationNode = parsedSchema.definitions.find(isMutationNode);
  if (!queryNode && !mutationNode) {
    return [];
  }

  const customSqlDataSourceStrategies: CustomSqlDataSourceStrategy[] = [];

  if (queryNode) {
    const fields = fieldsWithSqlDirective(queryNode);
    for (const field of fields) {
      customSqlDataSourceStrategies.push({
        typeName: 'Query',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
      });
    }
  }

  if (mutationNode) {
    const fields = fieldsWithSqlDirective(mutationNode);
    for (const field of fields) {
      customSqlDataSourceStrategies.push({
        typeName: 'Mutation',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
      });
    }
  }

  return customSqlDataSourceStrategies;
};

const fieldsWithSqlDirective = (obj: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode): FieldDefinitionNode[] => {
  return obj.fields?.filter((field) => field.directives?.some((directive) => directive.name.value === SQL_DIRECTIVE_NAME)) ?? [];
};

/**
 * Get the ModelDataSourceStrategy for the given type from the context
 * @param dataSourceStrategiesProvider transfomer before step context
 * @param typeName model name defined in GraphQL schema definition
 * @returns Datasource provision strategy for the provided model.
 * @throws if there is no ModelDataSourceStrategy for the given model name
 */
export const getModelDataSourceStrategy = (
  dataSourceStrategiesProvider: DataSourceStrategiesProvider,
  typeName: string,
): ModelDataSourceStrategy => {
  const strategy = dataSourceStrategiesProvider.dataSourceStrategies[typeName];
  if (!strategy) {
    throw new Error(`No data source strategy found for ${typeName}`);
  }
  return strategy;
};

/**
 * Get the SQLLambdaModelDataSourceStrategy for the given type from the context
 * @param dataSourceStrategiesProvider transfomer before step context
 * @param typeName model name defined in GraphQL schema definition
 * @returns Datasource provision strategy for the provided model
 * @throws if there is no ModelDataSourceStrategy for the given model name, or if the assigned strategy is not a SQL strategy
 */
export const getSqlModelDataSourceStrategy = (
  dataSourceStrategiesProvider: DataSourceStrategiesProvider,
  typeName: string,
): SQLLambdaModelDataSourceStrategy => {
  const strategy = getModelDataSourceStrategy(dataSourceStrategiesProvider, typeName);
  if (!isSqlStrategy(strategy)) {
    throw new Error(`Data source strategy for ${typeName} is not a SQL strategy`);
  }
  return strategy;
};

/**
 * Type predicate that returns true if `obj` is one of the known DynamoDB-based strategies
 */
export const isDynamoDbStrategy = (
  strategy: ModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy,
): strategy is AmplifyDynamoDbModelDataSourceStrategy | DefaultDynamoDbModelDataSourceStrategy => {
  return isDefaultDynamoDbModelDataSourceStrategy(strategy) || isAmplifyDynamoDbModelDataSourceStrategy(strategy);
};

/**
 * Type predicate that returns true if `obj` is a DefaultDynamoDbModelDataSourceStrategy
 */
export const isDefaultDynamoDbModelDataSourceStrategy = (
  strategy: ModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy,
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
  strategy: ModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy,
): strategy is AmplifyDynamoDbModelDataSourceStrategy => {
  return (
    isDynamoDbType(strategy.dbType) &&
    typeof (strategy as any)['provisionStrategy'] === 'string' &&
    (strategy as any)['provisionStrategy'] === 'AMPLIFY_TABLE'
  );
};

/**
 * Type predicate that returns true if `dbType` is the DynamoDB database type
 * @param dbType the candidate dbType to check
 * @returns true if dbType is the DynamoDB database type
 */
export const isDynamoDbType = (dbType: ModelDataSourceDbType): dbType is 'DYNAMODB' => {
  return dbType === DDB_DB_TYPE;
};

/**
 * Type predicate that returns true if `obj` is a PartialSQLLambdaModelDataSourceStrategy
 */
export const isPartialSqlStrategy = (
  strategy: ModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy,
): strategy is PartialSQLLambdaModelDataSourceStrategy => {
  return isSqlDbType(strategy.dbType) && typeof (strategy as any).name === 'string';
};

/**
 * Type predicate that returns true if `obj` is a SQLLambdaModelDataSourceStrategy
 */
export const isSqlStrategy = (
  strategy: ModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy,
): strategy is SQLLambdaModelDataSourceStrategy => {
  return (
    isSqlDbType(strategy.dbType) && typeof (strategy as any).name === 'string' && typeof (strategy as any).dbConnectionConfig === 'object'
  );
};

/**
 * Type predicate that returns true if `dbType` is a supported SQL database type
 * @param dbType the candidate dbType to check
 * @returns true if dbType is one of the supported SQL engines
 */
export const isSqlDbType = (dbType: ModelDataSourceDbType): dbType is ModelDataSourceSqlDbType => {
  const validDbTypes: ModelDataSourceDbType[] = [MYSQL_DB_TYPE, POSTGRES_DB_TYPE];
  return validDbTypes.includes(dbType);
};

/**
 * Checks if the given model is resolved by a DynamoDB DataSource
 * @param dataSourceStrategiesProvider strategies provider to look up ModelDataSources by model name
 * @param typeName Model name
 * @returns boolean
 */
export const isDynamoDBModel = (dataSourceStrategiesProvider: DataSourceStrategiesProvider, typeName: string): boolean => {
  if (isBuiltInTypeName(typeName)) {
    return false;
  }
  const strategy = getModelDataSourceStrategy(dataSourceStrategiesProvider, typeName);
  return isDynamoDbStrategy(strategy);
};

/**
 * Checks if the given model is resolved by a SQL DataSource
 * @param dataSourceStrategiesProvider strategies provider to look up ModelDataSources by model name
 * @param typeName Model name
 * @returns boolean
 */
export const isSqlModel = (dataSourceStrategiesProvider: DataSourceStrategiesProvider, typeName: string): boolean => {
  if (isBuiltInTypeName(typeName)) {
    return false;
  }
  const strategy = getModelDataSourceStrategy(dataSourceStrategiesProvider, typeName);
  return isSqlStrategy(strategy);
};

/**
 * Normalize known variants of a database type to its canonical representation. E.g.:
 *
 * ```ts
 * normalizeDbType('MySQL') // => 'MYSQL'
 * normalizeDbType('PostgreSQL') // => 'POSTGRES'
 * normalizeDbType('DDB') // => 'DYNAMODB'
 * normalizeDbType('dynamodb') // => 'DYNAMODB'
 * ```
 * @param candidate the type string to normalize
 * @returns the canonical database type
 * @throws if the type is not recognized
 */
export const normalizeDbType = (candidate: string): ModelDataSourceDbType => {
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

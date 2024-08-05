import { print } from 'graphql';
import { EXTRA_DIRECTIVES_DOCUMENT } from './transformation/validation';

export { MappingTemplate } from './cdk-compat';
export {
  ConflictDetectionType,
  ConflictHandlerType,
  ResolverConfig,
  SyncConfig,
  SyncConfigLambda,
  SyncConfigOptimistic,
  SyncConfigServer,
  TransformConfig,
} from './config/index';
export * from './errors';
export {
  constructDataSourceStrategies,
  constructSqlDirectiveDataSourceStrategies,
  getModelTypeNames,
  GraphQLTransform,
  GraphQLTransformOptions,
  SyncUtils,
} from './transformation';
export {
  TransformerAuthBase,
  TransformerModelBase,
  TransformerModelEnhancerBase,
  TransformerPluginBase,
} from './transformation/transformer-plugin-base';
export { UserDefinedResolver, UserDefinedSlot } from './transformation/types';
export { validateModelSchema } from './transformation/validation';
export { StackManager, TransformerResolver } from './transformer-context';
export {
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  DDB_DB_TYPE,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  ImportAppSyncAPIInputs,
  ImportedDataSourceConfig,
  ImportedDataSourceType,
  ImportedRDSType,
  MYSQL_DB_TYPE,
  POSTGRES_DB_TYPE,
  RDSConnectionSecrets,
  RDSDataSourceConfig,
  SQL_SCHEMA_FILE_NAME,
} from './types';
export {
  APICategory,
  collectDirectives,
  collectDirectivesByTypeNames,
  constructArrayFieldsStatement,
  constructAuthFilterStatement,
  constructFieldMappingInput,
  constructNonScalarFieldsStatement,
  DirectiveWrapper,
  fieldsWithSqlDirective,
  generateGetArgumentsInput,
  GetArgumentsOptions,
  getArrayFields,
  getConditionInputName,
  getConnectionName,
  getDefaultStrategyNameForDbType,
  getField,
  getFilterInputName,
  getImportedRDSTypeFromStrategyDbType,
  getKeySchema,
  getModelDataSourceNameForTypeName,
  getModelDataSourceStrategy,
  getNonScalarFields,
  getParameterStoreSecretPath,
  getPrimaryKeyFieldNodes,
  getPrimaryKeyFields,
  getResourceName,
  getResourceNamesForStrategy,
  getResourceNamesForStrategyName,
  getSortKeyFieldNames,
  getStrategyDbTypeFromModel,
  getStrategyDbTypeFromTypeNode,
  getSubscriptionFilterInputName,
  getTable,
  getType,
  isAmplifyDynamoDbModelDataSourceStrategy,
  isBuiltInGraphqlNode,
  isDefaultDynamoDbModelDataSourceStrategy,
  isDynamoDbModel,
  isDynamoDbType,
  isModelType,
  isMutationNode,
  isObjectTypeDefinitionNode,
  isQueryNode,
  isSqlDbType,
  isSqlModel,
  isSqlStrategy,
  normalizeDbType,
  setResourceName,
  SQLLambdaResourceNames,
} from './utils';
export type { SetResourceNameProps } from './utils';
export * from './utils/operation-names';
export {
  EnumWrapper,
  FieldWrapper,
  InputFieldWrapper,
  InputObjectDefinitionWrapper,
  ObjectDefinitionWrapper,
} from './wrappers/object-definition-wrapper';
/**
 * Returns the extra set of directives that are supported by AppSync service.
 */
export const getAppSyncServiceExtraDirectives = (): string => {
  return print(EXTRA_DIRECTIVES_DOCUMENT);
};

// No-op change to trigger re-publish

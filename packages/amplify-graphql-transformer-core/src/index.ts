import { print } from 'graphql';
import { EXTRA_DIRECTIVES_DOCUMENT } from './transformation/validation';

export { GraphQLTransform, GraphQLTransformOptions, SyncUtils } from './transformation';
export { UserDefinedSlot, UserDefinedResolver } from './transformation/types';
export { validateModelSchema } from './transformation/validation';
export {
  ConflictDetectionType,
  ConflictHandlerType,
  ResolverConfig,
  SyncConfig,
  SyncConfigOptimistic,
  SyncConfigServer,
  SyncConfigLambda,
  TransformConfig,
  DatasourceType,
  DBType,
} from './config/index';
export {
  GetArgumentsOptions,
  generateGetArgumentsInput,
  getTable,
  getKeySchema,
  getSortKeyFieldNames,
  getParameterStoreSecretPath,
  collectDirectives,
  collectDirectivesByTypeNames,
  DirectiveWrapper,
  APICategory,
  getPrimaryKeyFields,
  getDatasourceType,
  setResourceName,
  getResourceName,
} from './utils';
export type { SetResourceNameProps } from './utils';
export * from './utils/operation-names';
export * from './errors';
export {
  TransformerModelBase,
  TransformerModelEnhancerBase,
  TransformerPluginBase,
  TransformerAuthBase,
} from './transformation/transformer-plugin-base';
export { TransformerResolver, StackManager } from './transformer-context';
export {
  DDB_DB_TYPE,
  ImportAppSyncAPIInputs,
  ImportedDataSourceType,
  ImportedRDSType,
  MYSQL_DB_TYPE,
  RDS_SCHEMA_FILE_NAME,
  RDSConnectionSecrets,
  ImportedDataSourceConfig,
  RDSDataSourceConfig,
} from './types';
/**
 * Returns the extra set of directives that are supported by AppSync service.
 */
export const getAppSyncServiceExtraDirectives = (): string => {
  return print(EXTRA_DIRECTIVES_DOCUMENT);
};

export { MappingTemplate } from './cdk-compat';
export {
  EnumWrapper,
  FieldWrapper,
  InputFieldWrapper,
  InputObjectDefinitionWrapper,
  ObjectDefinitionWrapper,
} from './wrappers/object-definition-wrapper';
// No-op change to trigger re-publish

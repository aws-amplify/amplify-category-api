/* ATTENTION
 *
 * If you modify this file you must also modify packages/amplify-data-construct/src/index.ts to have the same exports
 */
export {
  AmplifyDynamoDbTableWrapper,
  ProvisionedThroughput,
  SSESpecification,
  SSEType,
  StreamSpecification,
  TimeToLiveSpecification,
} from './amplify-dynamodb-table-wrapper';
export { AmplifyGraphqlApi } from './amplify-graphql-api';
export { AmplifyGraphqlDefinition } from './amplify-graphql-definition';
export * from './model-datasource-strategy-types';
export { SQLLambdaModelDataSourceStrategyFactory } from './sql-model-datasource-strategy';
export type {
  AddFunctionProps,
  AmplifyGraphqlApiCfnResources,
  AmplifyGraphqlApiProps,
  AmplifyGraphqlApiResources,
  ApiKeyAuthorizationConfig,
  AuthorizationModes,
  AutomergeConflictResolutionStrategy,
  ConflictDetectionType,
  ConflictResolution,
  ConflictResolutionStrategy,
  ConflictResolutionStrategyBase,
  CustomConflictResolutionStrategy,
  DataStoreConfiguration,
  FunctionSlot,
  FunctionSlotBase,
  FunctionSlotOverride,
  IAMAuthorizationConfig,
  IAmplifyGraphqlDefinition,
  IBackendOutputEntry,
  IBackendOutputStorageStrategy,
  IdentityPoolAuthorizationConfig,
  LambdaAuthorizationConfig,
  MutationFunctionSlot,
  OIDCAuthorizationConfig,
  OptimisticConflictResolutionStrategy,
  PartialTranslationBehavior,
  QueryFunctionSlot,
  SubscriptionFunctionSlot,
  TranslationBehavior,
  UserPoolAuthorizationConfig,
} from './types';

/* ATTENTION
 *
 * If you modify this file you must also modify packages/amplify-data-construct/src/index.ts to have the same exports
 */
export type {
  IAMAuthorizationConfig,
  IdentityPoolAuthorizationConfig,
  UserPoolAuthorizationConfig,
  OIDCAuthorizationConfig,
  ApiKeyAuthorizationConfig,
  LambdaAuthorizationConfig,
  AuthorizationModes,
  PartialTranslationBehavior,
  AmplifyGraphqlApiProps,
  AmplifyGraphqlApiResources,
  AmplifyGraphqlApiCfnResources,
  FunctionSlotBase,
  MutationFunctionSlot,
  QueryFunctionSlot,
  SubscriptionFunctionSlot,
  FunctionSlot,
  FunctionSlotOverride,
  ConflictResolution,
  DataStoreConfiguration,
  ConflictDetectionType,
  OptimisticConflictResolutionStrategy,
  CustomConflictResolutionStrategy,
  AutomergeConflictResolutionStrategy,
  ConflictResolutionStrategyBase,
  ConflictResolutionStrategy,
  TranslationBehavior,
  IAmplifyGraphqlDefinition,
  IBackendOutputStorageStrategy,
  IBackendOutputEntry,
  AddFunctionProps,
} from './types';
export { AmplifyGraphqlApi } from './amplify-graphql-api';
export { AmplifyGraphqlDefinition } from './amplify-graphql-definition';
export {
  AmplifyDynamoDbTableWrapper,
  TimeToLiveSpecification,
  ProvisionedThroughput,
  SSESpecification,
  SSEType,
  StreamSpecification,
} from './amplify-dynamodb-table-wrapper';
export { SQLLambdaModelDataSourceStrategyFactory } from './sql-model-datasource-strategy';
export * from './model-datasource-strategy-types';

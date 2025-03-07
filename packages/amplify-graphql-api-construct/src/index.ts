// ############################################################################
// Note that sections of this file are excluded from test coverage metrics with
// 'c8 ignore' comments. If you add code to this file, suppress non-executable
// code from coverage metrics by using a `c8 ignore`. If the code is
// executable, you MUST NOT suppress it from coverage metrics.
//
// `ignore` statements must only span a single block of code. Do not apply an
// `ignore` statement to multiple blocks, or the entire file.
// ############################################################################

/* ATTENTION
 *
 * If you modify this file you must also modify packages/amplify-data-construct/src/index.ts to have the same exports
 */
/* c8 ignore start */
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
/* c8 ignore stop */

/* c8 ignore start */
export { AmplifyGraphqlApi } from './amplify-graphql-api';
/* c8 ignore stop */

/* c8 ignore start */
export { AmplifyGraphqlDefinition } from './amplify-graphql-definition';
/* c8 ignore stop */

/* c8 ignore start */
export {
  AmplifyDynamoDbTableWrapper,
  TimeToLiveSpecification,
  PointInTimeRecoverySpecification,
  ProvisionedThroughput,
  SSESpecification,
  SSEType,
  StreamSpecification,
} from './amplify-dynamodb-table-wrapper';
/* c8 ignore stop */

/* c8 ignore start */
export { SQLLambdaModelDataSourceStrategyFactory } from './sql-model-datasource-strategy';
/* c8 ignore stop */

/* c8 ignore start */
export * from './model-datasource-strategy-types';
/* c8 ignore stop */

/* c8 ignore start */
export type { LogConfig, Logging } from './log-config-types';
/* c8 ignore stop */

/* c8 ignore start */
export { FieldLogLevel, RetentionDays } from './log-config-types';
/* c8 ignore stop */

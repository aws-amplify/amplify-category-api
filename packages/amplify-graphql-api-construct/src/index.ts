/* ATTENTION
 *
 * If you modify this file your must also modify packages/amplify-data-construct/src/index.ts to have the same exports
 */
export type {
  IAMAuthorizationConfig,
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
  ModelDataSourceStrategy,
  DefaultDynamoDbModelDataSourceStrategy,
  AmplifyDynamoDbModelDataSourceStrategy,
  SQLLambdaModelDataSourceStrategy,
  ModelDataSourceStrategyDbType,
  VpcConfig,
  SubnetAvailabilityZone,
  SQLLambdaLayerMapping,
  SqlModelDataSourceDbConnectionConfig,
  ProvisionedConcurrencyConfig,
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

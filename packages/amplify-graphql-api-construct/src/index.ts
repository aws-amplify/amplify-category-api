export type {
  IAMAuthorizationConfig,
  UserPoolAuthorizationConfig,
  OIDCAuthorizationConfig,
  ApiKeyAuthorizationConfig,
  LambdaAuthorizationConfig,
  AuthorizationConfig,
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
  BackendOutputEntry,
} from './types';
export { AmplifyGraphqlApi } from './amplify-graphql-api';
export { AmplifyGraphqlDefinition } from './amplify-graphql-definition';

// remove these exports when provided by cli
export { GraphqlOutput, versionedGraphqlOutputSchema } from './graphql-output';

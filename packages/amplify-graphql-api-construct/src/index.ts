export type {
  IAMAuthorizationConfig,
  UserPoolAuthorizationConfig,
  OIDCAuthorizationConfig,
  ApiKeyAuthorizationConfig,
  LambdaAuthorizationConfig,
  AuthorizationConfig,
  PartialSchemaTranslationBehavior,
  AmplifyApiSchemaPreprocessorOutput,
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
  SchemaTranslationBehavior,
  IAmplifyGraphqlSchema,
  IBackendOutputStorageStrategy,
  BackendOutputEntry,
} from './types';
export { AmplifyGraphqlApi } from './amplify-graphql-api';

// remove these exports when provided by cli
export { GraphqlOutput, versionedGraphqlOutputSchema } from './graphql-output';

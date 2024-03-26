export * from './directives';
import type { Directive } from './directives';
import {
  AuthDirective,
  AuthDirectiveV1,
  AwsApiKeyDirective,
  AwsAuthDirective,
  AwsCognitoUserPoolsDirective,
  AwsIamDirective,
  AwsLambdaDirective,
  AwsOidcDirective,
  AwsSubscribeDirective,
  BelongsToDirective,
  ConnectionDirective,
  DefaultDirective,
  DeprecatedDirective,
  FunctionDirective,
  FunctionDirectiveV1,
  HasManyDirective,
  HasOneDirective,
  HttpDirective,
  HttpDirectiveV1,
  IndexDirective,
  KeyDirective,
  ManyToManyDirective,
  MapsToDirective,
  ModelDirective,
  ModelDirectiveV1,
  PredictionsDirective,
  PredictionsDirectiveV1,
  PrimaryKeyDirective,
  RefersToDirective,
  SearchableDirective,
  SearchableDirectiveV1,
  SqlDirective,
  VersionedDirective,
} from './directives';

export const AppSyncDirectives: readonly Directive[] = [
  AwsApiKeyDirective,
  AwsAuthDirective,
  AwsCognitoUserPoolsDirective,
  AwsIamDirective,
  AwsLambdaDirective,
  AwsOidcDirective,
  AwsSubscribeDirective,
];

// This list should match constructTransformerChain in packages/amplify-graphql-transformer/src/graphql-transformer.ts
export const V2Directives: readonly Directive[] = [
  AuthDirective,
  BelongsToDirective,
  DefaultDirective,
  DeprecatedDirective,
  FunctionDirective,
  HasManyDirective,
  HasOneDirective,
  HttpDirective,
  IndexDirective,
  ManyToManyDirective,
  MapsToDirective,
  ModelDirective,
  PredictionsDirective,
  PrimaryKeyDirective,
  RefersToDirective,
  SearchableDirective,
  SqlDirective,
];

/**
 * Default directives used by the GraphQL transform.
 */
export const DefaultDirectives: readonly Directive[] = AppSyncDirectives.concat(V2Directives);

export const V1Directives: readonly Directive[] = [
  AuthDirectiveV1,
  ConnectionDirective,
  FunctionDirectiveV1,
  HttpDirectiveV1,
  KeyDirective,
  ModelDirectiveV1,
  PredictionsDirectiveV1,
  SearchableDirectiveV1,
  VersionedDirective,
];

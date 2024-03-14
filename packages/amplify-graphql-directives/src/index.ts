export * from './directives';
import type { Directive } from './directives';
import {
  AuthDirective,
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
  HasManyDirective,
  HasOneDirective,
  HttpDirective,
  IndexDirective,
  KeyDirective,
  ManyToManyDirective,
  MapsToDirective,
  ModelDirective,
  PredictionsDirective,
  PrimaryKeyDirective,
  RefersToDirective,
  SearchableDirective,
  SqlDirective,
  VersionedDirective,
} from './directives';

// This list should match constructTransformerChain in packages/amplify-graphql-transformer/src/graphql-transformer.ts
/**
 * Default directives used by the GraphQL transform.
 */
export const DefaultDirectives: Directive[] = [
  AuthDirective,
  AwsApiKeyDirective,
  AwsAuthDirective,
  AwsCognitoUserPoolsDirective,
  AwsIamDirective,
  AwsLambdaDirective,
  AwsOidcDirective,
  AwsSubscribeDirective,
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

export const V1Directives: Directive[] = [ConnectionDirective, KeyDirective, VersionedDirective];

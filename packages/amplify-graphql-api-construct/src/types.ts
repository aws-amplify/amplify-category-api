import { Duration, CfnResource } from 'aws-cdk-lib';
import {
  SchemaFile,
  CfnGraphQLApi,
  CfnGraphQLSchema,
  CfnApiKey,
  CfnResolver,
  CfnFunctionConfiguration,
  CfnDataSource,
} from 'aws-cdk-lib/aws-appsync';
import { CfnTable } from 'aws-cdk-lib/aws-dynamodb';
import { IRole, CfnRole, CfnPolicy } from 'aws-cdk-lib/aws-iam';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { ResolverConfig } from '@aws-amplify/graphql-transformer-core';
import { TransformParameters, TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';

export type IAMAuthorizationConfig = {
  identityPoolId?: string;
  authRole?: IRole;
  unauthRole?: IRole;
  adminRoles?: IRole[];
};

export type UserPoolAuthorizationConfig = {
  userPool: IUserPool;
};

export type OIDCAuthorizationConfig = {
  oidcProviderName: string;
  oidcIssuerUrl: string;
  clientId?: string;
  tokenExpiryFromAuth: Duration;
  tokenExpiryFromIssue: Duration;
};

export type ApiKeyAuthorizationConfig = {
  description?: string;
  expires: Duration;
};

export type LambdaAuthorizationConfig = {
  function: IFunction;
  ttl: Duration;
};

/**
 * Authorization Config to apply to the API.
 * At least one config must be provided, and if more than one are provided,
 * a defaultAuthMode must be specified.
 * For more information on Amplify API auth, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/#authorization-strategies
 */
export type AuthorizationConfig = {
  /**
   * Default auth mode to provide to the API, required if more than one config type is specified.
   */
  defaultAuthMode?:
    | 'AWS_IAM'
    | 'AMAZON_COGNITO_USER_POOLS'
    | 'OPENID_CONNECT'
    | 'API_KEY'
    | 'AWS_LAMBDA';

  /**
   * IAM Auth config, required if an 'iam' auth provider is specified in the API.
   * Applies to 'public' and 'private' auth strategies.
   */
  iamConfig?: IAMAuthorizationConfig;

  /**
   * Cognito UserPool config, required if a 'userPools' auth provider is specified in the API.
   * Applies to 'owner', 'private', and 'group' auth strategies.
   */
  userPoolConfig?: UserPoolAuthorizationConfig;

  /**
   * Cognito OIDC config, required if a 'oidc' auth provider is specified in the API.
   * Applies to 'owner', 'private', and 'group' auth strategies.
   */
  oidcConfig?: OIDCAuthorizationConfig;

  /**
   * AppSync API Key config, required if a 'apiKey' auth provider is specified in the API.
   * Applies to 'public' auth strategy.
   */
  apiKeyConfig?: ApiKeyAuthorizationConfig;

  /**
   * Lambda config, required if a 'function' auth provider is specified in the API.
   * Applies to 'custom' auth strategy.
   */
  lambdaConfig?: LambdaAuthorizationConfig;
};

/**
 * Schema representation for transformation. Accepts either a raw string, single, or array of appsync SchemaFile objects.
 */
export type AmplifyGraphqlApiSchema =
  | SchemaFile
  | SchemaFile[]
  | string;

/**
 * Common slot parameters.
 */
export type FunctionSlotBase = {
  fieldName: string;
  slotIndex: number;
  templateType: 'req' | 'res';
  resolverCode: string;
};

/**
 * Slot types for Mutation Resolvers.
 */
export type MutationFunctionSlot = FunctionSlotBase & {
  typeName: 'Mutation';
  slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preUpdate' | 'postUpdate' | 'finish';
};

/**
 * Slot types for Query Resolvers.
 */
export type QueryFunctionSlot = FunctionSlotBase & {
  typeName: 'Query';
  slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preDataLoad' | 'postDataLoad' | 'finish';
};

/**
 * Slot types for Subscription Resolvers.
 */
export type SubscriptionFunctionSlot = FunctionSlotBase & {
  typeName: 'Subscription';
  slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preSubscribe';
};

/**
 * Input params to uniquely identify the slot which is being overridden.
 */
export type FunctionSlot =
  | MutationFunctionSlot
  | QueryFunctionSlot
  | SubscriptionFunctionSlot;

/**
 * Input props for the AmplifyGraphQLApi construct. Specifies what the input to transform into an API, and configurations for
 * the transformation process.
 */
export type AmplifyGraphqlApiProps = {
  /**
   * The schema to transform in a full API.
   */
  schema: AmplifyGraphqlApiSchema;

  /**
   * Name to be used for the appsync api.
   * Default: construct id.
   */
  apiName?: string;

  /**
   * Required auth config for the API. This object must be a superset of the configured auth providers in the graphql schema.
   * For more information, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/
   */
  authorizationConfig: AuthorizationConfig;

  /**
   * ResolverConfig is used to set up conflict resolution on the API, which will enable DataStore API functionality.
   * For more information, refer to https://docs.amplify.aws/lib/datastore/getting-started/q/platform/js/
   */
  resolverConfig?: ResolverConfig;

  /**
   * StackMappings override the assigned nested stack on a per-resource basis. Only applies to resolvers, and takes the form
   * { <logicalId>: <stackName> }
   * It is not recommended to use this parameter unless you are encountering stack resource count limits, and worth noting that
   * after initial deployment AppSync resolvers cannot be moved between nested stacks, they will need to be removed from the app,
   * then re-added from a new stack.
   */
  stackMappings?: Record<string, string>;

  /**
   * Overrides for a given slot in the generated resolver pipelines. For more information about what slots are available,
   * refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#override-amplify-generated-resolvers.
   */
  functionSlots?: FunctionSlot[];

  /**
   * Provide a list of additional custom transformers which are injected into the transform process.
   */
  transformers?: TransformerPluginProvider[];

  /**
   * If using predictions, a bucket must be provided which will be used to search for assets.
   */
  predictionsBucket?: IBucket;

  /**
   * This replaces feature flags from the API construct, for general information on what these parameters do,
   * refer to https://docs.amplify.aws/cli/reference/feature-flags/#graphQLTransformer
   */
  transformParameters?: Partial<TransformParameters>
};

export type AmplifyGraphqlApiResources = {
  /**
   * The Generated AppSync API L1 Resource
   */
  api: CfnGraphQLApi;

  /**
   * The Generated AppSync Schema L1 Resource
   */
  schema: CfnGraphQLSchema;

  /**
   * The Generated AppSync API Key L1 Resource
   */
  apiKey?: CfnApiKey;

  /**
   * The Generated AppSync Resolver L1 Resources
   */
  resolvers: Record<string, CfnResolver>;

  /**
   * The Generated AppSync Function L1 Resources
   */
  appsyncFunctions: Record<string, CfnFunctionConfiguration>;

  /**
   * The Generated AppSync DataSource L1 Resources
   */
  dataSources: Record<string, CfnDataSource>;

  /**
   * The Generated DynamoDB Table L1 Resources
   */
  tables: Record<string, CfnTable>;

  /**
   * The Generated IAM Role L1 Resources
   */
  roles: Record<string, CfnRole>;

  /**
   * The Generated IAM Policy L1 Resources
   */
  policies: Record<string, CfnPolicy>;

  /**
   * Remaining L1 resources generated, keyed by CFN Resource type.
   */
  additionalResources: Record<string, CfnResource>;
};

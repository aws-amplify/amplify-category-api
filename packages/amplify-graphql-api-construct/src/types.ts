import { Duration, CfnResource, NestedStack } from 'aws-cdk-lib';
import {
  CfnGraphQLApi,
  CfnGraphQLSchema,
  CfnApiKey,
  CfnResolver,
  CfnFunctionConfiguration,
  CfnDataSource,
  IGraphqlApi,
  MappingTemplate,
} from 'aws-cdk-lib/aws-appsync';
import { CfnTable, ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IRole, CfnRole } from 'aws-cdk-lib/aws-iam';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IFunction, CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';

/**
 * Configuration for IAM Authorization on the Graphql API.
 */
export interface IAMAuthorizationConfig {
  readonly identityPoolId?: string;
  readonly authenticatedUserRole?: IRole;
  readonly unauthenticatedUserRole?: IRole;
  readonly adminRoles?: IRole[];
}

/**
 * Configuration for Cognito UserPool Authorization on the Graphql API.
 */
export interface UserPoolAuthorizationConfig {
  readonly userPool: IUserPool;
}

/**
 * Configuration for OpenId Connect Authorization on the Graphql API.
 */
export interface OIDCAuthorizationConfig {
  readonly oidcProviderName: string;
  readonly oidcIssuerUrl: string;
  readonly clientId?: string;
  readonly tokenExpiryFromAuth: Duration;
  readonly tokenExpiryFromIssue: Duration;
}

/**
 * Configuration for API Keys on the Graphql API.
 */
export interface ApiKeyAuthorizationConfig {
  readonly description?: string;
  readonly expires: Duration;
}

/**
 * Configuration for Custom Lambda authorization on the Graphql API.
 */
export interface LambdaAuthorizationConfig {
  readonly function: IFunction;
  readonly ttl: Duration;
}

/**
 * Authorization Config to apply to the API.
 * At least one config must be provided, and if more than one are provided,
 * a defaultAuthMode must be specified.
 * For more information on Amplify API auth, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/#authorization-strategies
 */
export interface AuthorizationConfig {
  /**
   * Default auth mode to provide to the API, required if more than one config type is specified.
   */
  readonly defaultAuthMode?: 'AWS_IAM' | 'AMAZON_COGNITO_USER_POOLS' | 'OPENID_CONNECT' | 'API_KEY' | 'AWS_LAMBDA';

  /**
   * IAM Auth config, required if an 'iam' auth provider is specified in the API.
   * Applies to 'public' and 'private' auth strategies.
   */
  readonly iamConfig?: IAMAuthorizationConfig;

  /**
   * Cognito UserPool config, required if a 'userPools' auth provider is specified in the API.
   * Applies to 'owner', 'private', and 'group' auth strategies.
   */
  readonly userPoolConfig?: UserPoolAuthorizationConfig;

  /**
   * Cognito OIDC config, required if a 'oidc' auth provider is specified in the API.
   * Applies to 'owner', 'private', and 'group' auth strategies.
   */
  readonly oidcConfig?: OIDCAuthorizationConfig;

  /**
   * AppSync API Key config, required if a 'apiKey' auth provider is specified in the API.
   * Applies to 'public' auth strategy.
   */
  readonly apiKeyConfig?: ApiKeyAuthorizationConfig;

  /**
   * Lambda config, required if a 'function' auth provider is specified in the API.
   * Applies to 'custom' auth strategy.
   */
  readonly lambdaConfig?: LambdaAuthorizationConfig;
}

/**
 * Whether or not to use a version field to track conflict detection.
 */
export type ConflictDetectionType = 'VERSION' | 'NONE';

/**
 * Common parameters for conflict resolution.
 */
export interface ConflictResolutionStrategyBase {
  readonly detectionType: ConflictDetectionType;
}

/**
 * Enable optimistic concurrency on the project.
 */
export interface AutomergeConflictResolutionStrategy extends ConflictResolutionStrategyBase {
  readonly handlerType: 'AUTOMERGE';
}

/**
 * Enable automerge on the project.
 */
export interface OptimisticConflictResolutionStrategy extends ConflictResolutionStrategyBase {
  readonly handlerType: 'OPTIMISTIC_CONCURRENCY';
}

/**
 * Enable custom sync on the project, powered by a lambda.
 */
export interface CustomConflictResolutionStrategy extends ConflictResolutionStrategyBase {
  readonly handlerType: 'LAMBDA';
  readonly conflictHandler: IFunction;
}

/**
 * Conflict Resolution Strategy to apply to the project or a particular model.
 */
export type ConflictResolutionStrategy =
  | AutomergeConflictResolutionStrategy
  | OptimisticConflictResolutionStrategy
  | CustomConflictResolutionStrategy;

/**
 * Project level configuration for conflict resolution.
 */
export interface ConflictResolution {
  /**
   * Project-wide config for conflict resolution. Applies to all non-overridden models.
   */
  readonly project?: ConflictResolutionStrategy;

  /**
   * Model-specific conflict resolution overrides.
   */
  readonly models?: Record<string, ConflictResolutionStrategy>;
}

/**
 * Custom type representing a processed schema output.
 */
export interface AmplifyApiSchemaPreprocessorOutput {
  /**
   * Schema generated as an output of the preprocessing step.
   */
  readonly processedSchema: string;

  /**
   * Custom functions extracted during preprocessing.
   */
  readonly processedFunctionSlots?: FunctionSlot[];
}

/**
 * Params exposed to support configuring and overriding pipelined slots. This allows configuration of the underlying function,
 * including the request and response mapping templates.
 */
export interface FunctionSlotOverride {
  readonly requestMappingTemplate?: MappingTemplate;
  readonly responseMappingTemplate?: MappingTemplate;
}

/**
 * Common slot parameters.
 */
export interface FunctionSlotBase {
  readonly fieldName: string;
  readonly slotIndex: number;
  readonly function: FunctionSlotOverride;
}

/**
 * Slot types for Mutation Resolvers.
 */
export interface MutationFunctionSlot extends FunctionSlotBase {
  readonly typeName: 'Mutation';
  readonly slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preUpdate' | 'postUpdate' | 'finish';
}

/**
 * Slot types for Query Resolvers.
 */
export interface QueryFunctionSlot extends FunctionSlotBase {
  readonly typeName: 'Query';
  readonly slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preDataLoad' | 'postDataLoad' | 'finish';
}

/**
 * Slot types for Subscription Resolvers.
 */
export interface SubscriptionFunctionSlot extends FunctionSlotBase {
  readonly typeName: 'Subscription';
  readonly slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preSubscribe';
}

/**
 * Input params to uniquely identify the slot which is being overridden.
 */
export type FunctionSlot = MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot;

/**
 * Strongly typed set of shared parameters for all transformers, and core layer.
 * This is intended to replace feature flags, to ensure param coercion happens in
 * a single location, and isn't spread around the transformers, where they can
 * have different default behaviors.
 */
export interface SchemaTranslationBehavior {
  /**
   * Restore parity w/ GQLv1 @model parameter behavior, where setting a single field doesn't implicitly set the other fields to null.
   */
  readonly shouldDeepMergeDirectiveConfigDefaults: boolean;

  /**
   * Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can
   * lead to circular dependencies across stacks if models are reordered.
   */
  readonly disableResolverDeduping: boolean;

  /**
   * Enabling sandbox mode will enable api key auth on all models in the transformed schema.
   */
  readonly sandboxModeEnabled: boolean;

  /**
   * Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same
   * id to access data from a deleted user in the pool.
   */
  readonly useSubUsernameForDefaultIdentityClaim: boolean;

  /**
   * Ensure that the owner field is still populated even if a static iam or group authorization applies.
   */
  readonly populateOwnerFieldForStaticGroupAuth: boolean;

  /**
   * If enabled, disable api key resource generation even if specified as an auth rule on the construct.
   * This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.
   */
  readonly suppressApiKeyGeneration: boolean;

  /**
   * If disabled, generated @index as an LSI instead of a GSI.
   */
  readonly secondaryKeyAsGSI: boolean;

  /**
   * Automate generation of query names, and as a result attaching all indexes as queries to the generated API.
   * If enabled, @index can be provided a null name field to disable the generation of the query on the api.
   */
  readonly enableAutoIndexQueryNames: boolean;

  /**
   * Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.
   */
  readonly respectPrimaryKeyAttributesOnConnectionField: boolean;

  /**
   * If enabled, set nodeToNodeEncryption on the searchable domain (if one exists). Not recommended for use, prefer
   * to use `Object.values(resources.additionalResources['AWS::Elasticsearch::Domain']).forEach((domain: CfnDomain) => {
   *   domain.NodeToNodeEncryptionOptions = { Enabled: True };
   * });
   */
  readonly enableSearchNodeToNodeEncryption: boolean;
}

export interface PartialSchemaTranslationBehavior {
  /**
   * Restore parity w/ GQLv1 @model parameter behavior, where setting a single field doesn't implicitly set the other fields to null.
   */
  readonly shouldDeepMergeDirectiveConfigDefaults?: boolean;

  /**
   * Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can
   * lead to circular dependencies across stacks if models are reordered.
   */
  readonly disableResolverDeduping?: boolean;

  /**
   * Enabling sandbox mode will enable api key auth on all models in the transformed schema.
   */
  readonly sandboxModeEnabled?: boolean;

  /**
   * Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same
   * id to access data from a deleted user in the pool.
   */
  readonly useSubUsernameForDefaultIdentityClaim?: boolean;

  /**
   * Ensure that the owner field is still populated even if a static iam or group authorization applies.
   */
  readonly populateOwnerFieldForStaticGroupAuth?: boolean;

  /**
   * If enabled, disable api key resource generation even if specified as an auth rule on the construct.
   * This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.
   */
  readonly suppressApiKeyGeneration?: boolean;

  /**
   * If disabled, generated @index as an LSI instead of a GSI.
   */
  readonly secondaryKeyAsGSI?: boolean;

  /**
   * Automate generation of query names, and as a result attaching all indexes as queries to the generated API.
   * If enabled, @index can be provided a null name field to disable the generation of the query on the api.
   */
  readonly enableAutoIndexQueryNames?: boolean;

  /**
   * Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.
   */
  readonly respectPrimaryKeyAttributesOnConnectionField?: boolean;

  /**
   * If enabled, set nodeToNodeEncryption on the searchable domain (if one exists). Not recommended for use, prefer
   * to use `Object.values(resources.additionalResources['AWS::Elasticsearch::Domain']).forEach((domain: CfnDomain) => {
   *   domain.NodeToNodeEncryptionOptions = { Enabled: True };
   * });
   */
  readonly enableSearchNodeToNodeEncryption?: boolean;
}

/**
 * Graphql schema definition, which can be implemented in multiple ways.
 */
export interface IAmplifyGraphqlSchema {
  /**
   * Return the schema definition as a graphql string.
   * @returns the rendered schema.
   */
  readonly definition: string;

  /**
   * Retrieve any function slots defined explicitly in the schema.
   * @returns generated function slots
   */
  readonly functionSlots: FunctionSlot[];
}

export interface BackendOutputEntry {
  readonly version: string;
  readonly payload: Record<string, string>;
}

export interface IBackendOutputStorageStrategy {
  /**
   * Add an entry to backend output.
   * @param keyName the key
   * @param strategy the backend output strategy information.
   */
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  addBackendOutputEntry(keyName: string, strategy: BackendOutputEntry): void;

  /**
   * Write all pending data to the destination
   */
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  flush(): void;
}

/**
 * Input props for the AmplifyGraphqlApi construct. Specifies what the input to transform into an API, and configurations for
 * the transformation process.
 */
export interface AmplifyGraphqlApiProps {
  /**
   * The schema to transform in a full API.
   */
  readonly schema: IAmplifyGraphqlSchema;

  /**
   * Name to be used for the appsync api.
   * Default: construct id.
   */
  readonly apiName?: string;

  /**
   * Required auth config for the API. This object must be a superset of the configured auth providers in the graphql schema.
   * For more information, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/
   */
  readonly authorizationConfig: AuthorizationConfig;

  /**
   * Lambda functions referenced in the schema's @function directives. The keys of this object are expected to be the
   * function name provided in the schema, and value is the function that name refers to. If a name is not found in this
   * map, then it is interpreted as the `functionName`, and an arn will be constructed using the current aws account and region
   * (or overridden values, if set in the directive).
   */
  readonly functionNameMap?: Record<string, IFunction>;

  /**
   * Configure conflict resolution on the API, which is required to enable DataStore API functionality.
   * For more information, refer to https://docs.amplify.aws/lib/datastore/getting-started/q/platform/js/
   */
  readonly conflictResolution?: ConflictResolution;

  /**
   * StackMappings override the assigned nested stack on a per-resource basis. Only applies to resolvers, and takes the form
   * { <logicalId>: <stackName> }
   * It is not recommended to use this parameter unless you are encountering stack resource count limits, and worth noting that
   * after initial deployment AppSync resolvers cannot be moved between nested stacks, they will need to be removed from the app,
   * then re-added from a new stack.
   */
  readonly stackMappings?: Record<string, string>;

  /**
   * Overrides for a given slot in the generated resolver pipelines. For more information about what slots are available,
   * refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#override-amplify-generated-resolvers.
   */
  readonly functionSlots?: FunctionSlot[];

  /**
   * Provide a list of additional custom transformers which are injected into the transform process.
   */
  readonly transformers?: any[];

  /**
   * If using predictions, a bucket must be provided which will be used to search for assets.
   */
  readonly predictionsBucket?: IBucket;

  /**
   * This replaces feature flags from the API construct, for general information on what these parameters do,
   * refer to https://docs.amplify.aws/cli/reference/feature-flags/#graphQLTransformer
   */
  readonly schemaTranslationBehavior?: PartialSchemaTranslationBehavior;

  /**
   * Strategy to store construct outputs. If no outputStorageStrategey is provided a default strategy will be used.
   */
  readonly outputStorageStrategy?: IBackendOutputStorageStrategy;
}

/**
 * L1 CDK resources from the API which were generated as part of the transform.
 * These are potentially stored under nested stacks, but presented organized by type instead.
 */
export interface AmplifyGraphqlApiCfnResources {
  /**
   * The Generated AppSync API L1 Resource
   */
  readonly cfnGraphqlApi: CfnGraphQLApi;

  /**
   * The Generated AppSync Schema L1 Resource
   */
  readonly cfnGraphqlSchema: CfnGraphQLSchema;

  /**
   * The Generated AppSync API Key L1 Resource
   */
  readonly cfnApiKey?: CfnApiKey;

  /**
   * The Generated AppSync Resolver L1 Resources, keyed by logicalId.
   */
  readonly cfnResolvers: Record<string, CfnResolver>;

  /**
   * The Generated AppSync Function L1 Resources, keyed by logicalId.
   */
  readonly cfnFunctionConfigurations: Record<string, CfnFunctionConfiguration>;

  /**
   * The Generated AppSync DataSource L1 Resources, keyed by logicalId.
   */
  readonly cfnDataSources: Record<string, CfnDataSource>;

  /**
   * The Generated DynamoDB Table L1 Resources, keyed by logicalId.
   */
  readonly cfnTables: Record<string, CfnTable>;

  /**
   * The Generated IAM Role L1 Resources, keyed by logicalId.
   */
  readonly cfnRoles: Record<string, CfnRole>;

  /**
   * The Generated Lambda Function L1 Resources, keyed by function name.
   */
  readonly cfnFunctions: Record<string, CfnFunction>;

  /**
   * Remaining L1 resources generated, keyed by logicalId.
   */
  readonly additionalCfnResources: Record<string, CfnResource>;
}

/**
 * Accessible resources from the API which were generated as part of the transform.
 * These are potentially stored under nested stacks, but presented organized by type instead.
 */
export interface AmplifyGraphqlApiResources {
  /**
   * The Generated AppSync API L2 Resource, includes the Schema.
   */
  readonly graphqlApi: IGraphqlApi;

  /**
   * The Generated DynamoDB Table L2 Resources, keyed by logicalId.
   */
  readonly tables: Record<string, ITable>;

  /**
   * The Generated IAM Role L2 Resources, keyed by logicalId.
   */
  readonly roles: Record<string, IRole>;

  /**
   * The Generated Lambda Function L1 Resources, keyed by function name.
   */
  readonly functions: Record<string, IFunction>;

  /**
   * L1 Cfn Resources, for when dipping down a level of abstraction is desirable.
   */
  readonly cfnResources: AmplifyGraphqlApiCfnResources;

  /**
   * Nested Stacks generated by the API Construct.
   */
  readonly nestedStacks: Record<string, NestedStack>;
}

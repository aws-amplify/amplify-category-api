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
  BaseDataSource,
  Code,
  FunctionRuntime,
} from 'aws-cdk-lib/aws-appsync';
import { CfnTable, ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IRole, CfnRole } from 'aws-cdk-lib/aws-iam';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IFunction, CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { AmplifyDynamoDbTableWrapper } from './amplify-dynamodb-table-wrapper';
import { CustomSqlDataSourceStrategy, ModelDataSourceStrategy } from './model-datasource-strategy-types';

/**
 * Configuration for IAM Authorization on the Graphql Api.
 * @struct - required since this interface begins with an 'I'
 */
export interface IAMAuthorizationConfig {
  /**
   * ID for the Cognito Identity Pool vending auth and unauth roles.
   * Format: `<region>:<id string>`
   *
   * @deprecated Use 'IdentityPoolAuthorizationConfig.identityPoolId' instead.
   * See https://docs.amplify.aws/cli/react/tools/cli/migration/iam-auth-updates-for-cdk-construct for details.
   */
  readonly identityPoolId?: string;

  /**
   * Authenticated user role, applies to { provider: iam, allow: private } access.
   *
   * @deprecated Use 'IdentityPoolAuthorizationConfig.authenticatedUserRole' instead.
   * See https://docs.amplify.aws/cli/react/tools/cli/migration/iam-auth-updates-for-cdk-construct for details.
   */
  readonly authenticatedUserRole?: IRole;

  /**
   * Unauthenticated user role, applies to { provider: iam, allow: public } access.
   *
   * @deprecated Use 'IdentityPoolAuthorizationConfig.unauthenticatedUserRole' instead.
   * See https://docs.amplify.aws/cli/react/tools/cli/migration/iam-auth-updates-for-cdk-construct for details.
   */
  readonly unauthenticatedUserRole?: IRole;

  /**
   * A list of IAM roles which will be granted full read/write access to the generated model if IAM auth is enabled.
   * If an IRole is provided, the role `name` will be used for matching.
   * If a string is provided, the raw value will be used for matching.
   *
   * @deprecated Use 'enableIamAuthorizationMode' and IAM Policy to control access for IAM principals.
   * See https://docs.amplify.aws/cli/react/tools/cli/migration/iam-auth-updates-for-cdk-construct for details.
   */
  readonly allowListedRoles?: (IRole | string)[];

  /**
   * Enables access for IAM principals. If enabled @auth directive rules are not applied.
   * Instead, access should be defined by IAM Policy, see https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsappsync.html.
   *
   * Does not apply to authenticated and unauthenticated IAM Roles attached to Cognito Identity Pool.
   * Use IdentityPoolAuthorizationConfig to configure their access.
   */
  readonly enableIamAuthorizationMode?: boolean;
}

/**
 * Configuration for Cognito Identity Pool Authorization on the Graphql Api.
 * @struct - required since this interface begins with an 'I'
 */
export interface IdentityPoolAuthorizationConfig {
  /**
   * ID for the Cognito Identity Pool vending auth and unauth roles.
   * Format: `<region>:<id string>`
   */
  readonly identityPoolId: string;

  /**
   * Authenticated user role, applies to { provider: iam, allow: private } access.
   */
  readonly authenticatedUserRole: IRole;

  /**
   * Unauthenticated user role, applies to { provider: iam, allow: public } access.
   */
  readonly unauthenticatedUserRole: IRole;
}

/**
 * Configuration for Cognito UserPool Authorization on the Graphql Api.
 */
export interface UserPoolAuthorizationConfig {
  /**
   * The Cognito User Pool which is used to authenticated JWT tokens, and vends group and user information.
   */
  readonly userPool: IUserPool;
}

/**
 * Configuration for OpenId Connect Authorization on the Graphql Api.
 */
export interface OIDCAuthorizationConfig {
  /**
   * The issuer for the OIDC configuration.
   */
  readonly oidcProviderName: string;

  /**
   * Url for the OIDC token issuer.
   */
  readonly oidcIssuerUrl: string;

  /**
   * The client identifier of the Relying party at the OpenID identity provider.
   * A regular expression can be specified so AppSync can validate against multiple client identifiers at a time. Example
   */
  readonly clientId?: string;

  /**
   * The duration an OIDC token is valid after being authenticated by OIDC provider.
   * auth_time claim in OIDC token is required for this validation to work.
   */
  readonly tokenExpiryFromAuth: Duration;

  /**
   * The duration an OIDC token is valid after being issued to a user.
   * This validation uses iat claim of OIDC token.
   */
  readonly tokenExpiryFromIssue: Duration;
}

/**
 * Configuration for Api Keys on the Graphql Api.
 */
export interface ApiKeyAuthorizationConfig {
  /**
   * Optional description for the Api Key to attach to the Api.
   */
  readonly description?: string;

  /**
   * A duration representing the time from Cloudformation deploy until expiry.
   */
  readonly expires: Duration;
}

/**
 * Configuration for Custom Lambda authorization on the Graphql Api.
 */
export interface LambdaAuthorizationConfig {
  /**
   * The authorizer lambda function.
   */
  readonly function: IFunction;

  /**
   * How long the results are cached.
   */
  readonly ttl: Duration;
}

/**
 * Authorization Modes to apply to the Api.
 * At least one modes must be provided, and if more than one are provided a defaultAuthorizationMode must be specified.
 * For more information on Amplify Api auth, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/#authorization-strategies
 */
export interface AuthorizationModes {
  /**
   * Default auth mode to provide to the Api, required if more than one config type is specified.
   */
  readonly defaultAuthorizationMode?: 'AWS_IAM' | 'AMAZON_COGNITO_USER_POOLS' | 'OPENID_CONNECT' | 'API_KEY' | 'AWS_LAMBDA';

  /**
   * IAM Auth config, required to allow IAM-based access to this API.
   * This applies to any IAM principal except Amazon Cognito identity pool's authenticated and unauthenticated roles.
   * This behavior was has recently been improved.
   * See https://docs.amplify.aws/cli/react/tools/cli/migration/iam-auth-updates-for-cdk-construct for details.
   */
  readonly iamConfig?: IAMAuthorizationConfig;

  /**
   * Cognito Identity Pool config, required if an 'identityPool' auth provider is specified in the Api.
   * Applies to 'public' and 'private' auth strategies.
   */
  readonly identityPoolConfig?: IdentityPoolAuthorizationConfig;

  /**
   * Cognito UserPool config, required if a 'userPools' auth provider is specified in the Api.
   * Applies to 'owner', 'private', and 'group' auth strategies.
   */
  readonly userPoolConfig?: UserPoolAuthorizationConfig;

  /**
   * Cognito OIDC config, required if a 'oidc' auth provider is specified in the Api.
   * Applies to 'owner', 'private', and 'group' auth strategies.
   */
  readonly oidcConfig?: OIDCAuthorizationConfig;

  /**
   * AppSync Api Key config, required if a 'apiKey' auth provider is specified in the Api.
   * Applies to 'public' auth strategy.
   */
  readonly apiKeyConfig?: ApiKeyAuthorizationConfig;

  /**
   * Lambda config, required if a 'function' auth provider is specified in the Api.
   * Applies to 'custom' auth strategy.
   */
  readonly lambdaConfig?: LambdaAuthorizationConfig;

  /**
   * A list of roles granted full R/W access to the Api.
   * @deprecated, use iamConfig.allowListedRoles instead.
   */
  readonly adminRoles?: IRole[];
}

/**
 * Whether or not to use a version field to track conflict detection.
 */
export type ConflictDetectionType = 'VERSION' | 'NONE';

/**
 * Common parameters for conflict resolution.
 */
export interface ConflictResolutionStrategyBase {
  /**
   * The conflict detection type used for resolution.
   */
  readonly detectionType: ConflictDetectionType;
}

/**
 * Enable optimistic concurrency on the project.
 */
export interface AutomergeConflictResolutionStrategy extends ConflictResolutionStrategyBase {
  /**
   * This conflict resolution strategy executes an auto-merge.
   * For more information, refer to https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html#conflict-detection-and-resolution
   */
  readonly handlerType: 'AUTOMERGE';
}

/**
 * Enable automerge on the project.
 */
export interface OptimisticConflictResolutionStrategy extends ConflictResolutionStrategyBase {
  /**
   * This conflict resolution strategy the _version to perform optimistic concurrency.
   * For more information, refer to https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html#conflict-detection-and-resolution
   */
  readonly handlerType: 'OPTIMISTIC_CONCURRENCY';
}

/**
 * Enable custom sync on the project, powered by a lambda.
 */
export interface CustomConflictResolutionStrategy extends ConflictResolutionStrategyBase {
  /**
   * This conflict resolution strategy uses a lambda handler type.
   * For more information, refer to https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-sync.html#conflict-detection-and-resolution

   */
  readonly handlerType: 'LAMBDA';

  /**
   * The function which will be invoked for conflict resolution.
   */
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
 * @deprecated use DataStoreConfiguration instead.
 */
export interface ConflictResolution extends DataStoreConfiguration {}

/**
 * Project level configuration for DataStore
 */
export interface DataStoreConfiguration {
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
 * Params exposed to support configuring and overriding pipelined slots. This allows configuration of the underlying function,
 * including the request and response mapping templates.
 */
export interface FunctionSlotOverride {
  /**
   * Override request mapping template for the function slot. Executed before the datasource is invoked.
   */
  readonly requestMappingTemplate?: MappingTemplate;

  /**
   * Override response mapping template for the function slot. Executed after the datasource is invoked.
   */
  readonly responseMappingTemplate?: MappingTemplate;
}

/**
 * Common slot parameters.
 */
export interface FunctionSlotBase {
  /**
   * The field to attach this function to on the Api definition.
   */
  readonly fieldName: string;

  /**
   * The slot index to use to inject this into the execution pipeline.
   * For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers
   */
  readonly slotIndex: number;

  /**
   * The overridden behavior for this slot.
   */
  readonly function: FunctionSlotOverride;
}

/**
 * Slot types for Mutation Resolvers.
 */
export interface MutationFunctionSlot extends FunctionSlotBase {
  /**
   * This slot type applies to the Mutation type on the Api definition.
   */
  readonly typeName: 'Mutation';

  /**
   * The slot name to inject this behavior into.
   * For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers
   */
  readonly slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preUpdate' | 'postUpdate' | 'finish';
}

/**
 * Slot types for Query Resolvers.
 */
export interface QueryFunctionSlot extends FunctionSlotBase {
  /**
   * This slot type applies to the Query type on the Api definition.
   */
  readonly typeName: 'Query';

  /**
   * The slot name to inject this behavior into.
   * For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers
   */
  readonly slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preDataLoad' | 'postDataLoad' | 'finish';
}

/**
 * Slot types for Subscription Resolvers.
 */
export interface SubscriptionFunctionSlot extends FunctionSlotBase {
  /**
   * This slot type applies to the Subscription type on the Api definition.
   */
  readonly typeName: 'Subscription';

  /**
   * The slot name to inject this behavior into.
   * For more information on slotting, refer to https://docs.amplify.aws/cli/graphql/custom-business-logic/#extend-amplify-generated-resolvers
   */
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
export interface TranslationBehavior {
  /**
   * Restore parity w/ GQLv1 @model parameter behavior, where setting a single field doesn't implicitly set the other fields to null.
   * @default true
   */
  readonly shouldDeepMergeDirectiveConfigDefaults: boolean;

  /**
   * Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can
   * lead to circular dependencies across stacks if models are reordered.
   * @default true
   */
  readonly disableResolverDeduping: boolean;

  /**
   * Enabling sandbox mode will enable api key auth on all models in the transformed schema.
   * @default false
   */
  readonly sandboxModeEnabled: boolean;

  /**
   * Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same
   * id to access data from a deleted user in the pool.
   * @default true
   */
  readonly useSubUsernameForDefaultIdentityClaim: boolean;

  /**
   * When enabled, suppresses default behavior of redacting relational fields when auth rules do not exactly match.
   * @default false
   */
  readonly subscriptionsInheritPrimaryAuth: boolean;

  /**
   * Ensure that the owner field is still populated even if a static iam or group authorization applies.
   * @default true
   */
  readonly populateOwnerFieldForStaticGroupAuth: boolean;

  /**
   * If enabled, disable api key resource generation even if specified as an auth rule on the construct.
   * This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.
   * @default false
   */
  readonly suppressApiKeyGeneration: boolean;

  /**
   * If disabled, generated @index as an LSI instead of a GSI.
   * @default true
   */
  readonly secondaryKeyAsGSI: boolean;

  /**
   * Automate generation of query names, and as a result attaching all indexes as queries to the generated Api.
   * If enabled, @index can be provided a null name field to disable the generation of the query on the Api.
   * @default true
   */
  readonly enableAutoIndexQueryNames: boolean;

  /**
   * Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.
   * @default true
   */
  readonly respectPrimaryKeyAttributesOnConnectionField: boolean;

  readonly enableSearchNodeToNodeEncryption: boolean;

  /**
   * When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted.
   * @default false
   */
  readonly enableTransformerCfnOutputs: boolean;

  /**
   * The following schema updates require replacement of the underlying DynamoDB table:
   *
   *  - Removing or renaming a model
   *  - Modifying the primary key of a model
   *  - Modifying a Local Secondary Index of a model (only applies to projects with secondaryKeyAsGSI turned off)
   *
   * ALL DATA WILL BE LOST when the table replacement happens. When enabled, destructive updates are allowed.
   * This will only affect DynamoDB tables with provision strategy "AMPLIFY_TABLE".
   * @default false
   * @experimental
   */
  readonly allowDestructiveGraphqlSchemaUpdates: boolean;

  /**
   * This behavior will only come into effect when both "allowDestructiveGraphqlSchemaUpdates" and this value are set to true
   *
   * When enabled, any GSI update operation will replace the table instead of iterative deployment, which will WIPE ALL EXISTING DATA but
   * cost much less time for deployment This will only affect DynamoDB tables with provision strategy "AMPLIFY_TABLE".
   * @default false
   * @experimental
   */
  readonly replaceTableUponGsiUpdate: boolean;

  /**
   * When disabled usage of Gen 1 patterns will result in an error thrown.
   *
   * Gen 1 Patterns that will be disabled when set to false:
   * - Use of @manyToMany
   * - Use of @searchable
   * - Use of @predictions
   * - Use of fields argument on @hasOne, @hasMany, and @belongsTo.
   * - Use of @hasOne, @hasMany, and @belongsTo on required fields.
   *
   * @default true
   * @internal
   * Warning: Although this has `public` access, it is intended for internal use and should not be used directly.
   * The behavior of this may change without warning.
   */
  readonly _allowGen1Patterns: boolean;
}

/**
 * A utility interface equivalent to Partial<TranslationBehavior>.
 */
export interface PartialTranslationBehavior {
  /**
   * Restore parity w/ GQLv1 @model parameter behavior, where setting a single field doesn't implicitly set the other fields to null.
   * @default true
   */
  readonly shouldDeepMergeDirectiveConfigDefaults?: boolean;

  /**
   * Disable resolver deduping, this can sometimes cause problems because dedupe ordering isn't stable today, which can
   * lead to circular dependencies across stacks if models are reordered.
   * @default true
   */
  readonly disableResolverDeduping?: boolean;

  /**
   * Enabling sandbox mode will enable api key auth on all models in the transformed schema.
   * @default false
   */
  readonly sandboxModeEnabled?: boolean;

  /**
   * Ensure that oidc and userPool auth use the `sub` field in the for the username field, which disallows new users with the same
   * id to access data from a deleted user in the pool.
   * @default true
   */
  readonly useSubUsernameForDefaultIdentityClaim?: boolean;

  /**
   * When enabled, suppresses default behavior of redacting relational fields when auth rules do not exactly match.
   * @default false
   */
  readonly subscriptionsInheritPrimaryAuth?: boolean;

  /**
   * Ensure that the owner field is still populated even if a static iam or group authorization applies.
   * @default true
   */
  readonly populateOwnerFieldForStaticGroupAuth?: boolean;

  /**
   * If enabled, disable api key resource generation even if specified as an auth rule on the construct.
   * This is a legacy parameter from the Graphql Transformer existing in Amplify CLI, not recommended to change.
   * @default false
   */
  readonly suppressApiKeyGeneration?: boolean;

  /**
   * If disabled, generated @index as an LSI instead of a GSI.
   * @default true
   */
  readonly secondaryKeyAsGSI?: boolean;

  /**
   * Automate generation of query names, and as a result attaching all indexes as queries to the generated Api.
   * If enabled, @index can be provided a null name field to disable the generation of the query on the Api.
   * @default true
   */
  readonly enableAutoIndexQueryNames?: boolean;

  /**
   * Enable custom primary key support, there's no good reason to disable this unless trying not to update a legacy app.
   * @default true
   */
  readonly respectPrimaryKeyAttributesOnConnectionField?: boolean;

  /**
   * If enabled, set nodeToNodeEncryption on the searchable domain (if one exists). Not recommended for use, prefer
   * to use `Object.values(resources.additionalResources['AWS::Elasticsearch::Domain']).forEach((domain: CfnDomain) => {
   *   domain.NodeToNodeEncryptionOptions = { Enabled: True };
   * });
   * @default false
   */
  readonly enableSearchNodeToNodeEncryption?: boolean;

  /**
   * When enabled, internal cfn outputs which existed in Amplify-generated apps will continue to be emitted.
   * @default false
   */
  readonly enableTransformerCfnOutputs?: boolean;

  /**
   * The following schema updates require replacement of the underlying DynamoDB table:
   *
   *  - Removing or renaming a model
   *  - Modifying the primary key of a model
   *  - Modifying a Local Secondary Index of a model (only applies to projects with secondaryKeyAsGSI turned off)
   *
   * ALL DATA WILL BE LOST when the table replacement happens. When enabled, destructive updates are allowed.
   * This will only affect DynamoDB tables with provision strategy "AMPLIFY_TABLE".
   * @default false
   * @experimental
   */
  readonly allowDestructiveGraphqlSchemaUpdates?: boolean;

  /**
   * This behavior will only come into effect when both "allowDestructiveGraphqlSchemaUpdates" and this value are set to true
   *
   * When enabled, any global secondary index update operation will replace the table instead of iterative deployment, which will WIPE ALL
   * EXISTING DATA but cost much less time for deployment This will only affect DynamoDB tables with provision strategy "AMPLIFY_TABLE".
   * @default false
   * @experimental
   */
  readonly replaceTableUponGsiUpdate?: boolean;

  /**
   * When disabled usage of Gen 1 patterns will result in an error thrown.
   *
   * Gen 1 Patterns that will be disabled when set to false:
   * - Use of @manyToMany
   * - Use of @searchable
   * - Use of @predictions
   * - Use of fields argument on @hasOne, @hasMany, and @belongsTo.
   * - Use of @hasOne, @hasMany, and @belongsTo on required fields.
   *
   * @default true
   * @internal
   * Warning: Although this has `public` access, it is intended for internal use and should not be used directly.
   * The behavior of this may change without warning.
   */
  readonly _allowGen1Patterns?: boolean;
}

/**
 * Graphql Api definition, which can be implemented in multiple ways.
 */
export interface IAmplifyGraphqlDefinition {
  /**
   * Return the schema definition as a graphql string, with amplify directives allowed.
   * @returns the rendered schema.
   */
  readonly schema: string;

  /**
   * Retrieve any function slots defined explicitly in the Api definition.
   * @returns generated function slots
   */
  readonly functionSlots: FunctionSlot[];

  /**
   * Retrieve the references to any lambda functions used in the definition.
   * Useful for wiring through aws_lambda.Function constructs into the definition directly,
   * and generated references to invoke them.
   * @returns any lambda functions, keyed by their referenced 'name' in the generated schema.
   */
  readonly referencedLambdaFunctions?: Record<string, IFunction>;

  /**
   * Retrieve the datasource strategy mapping. The default strategy is to use DynamoDB from CloudFormation.
   * @returns datasource strategy mapping
   */
  readonly dataSourceStrategies: Record<string, ModelDataSourceStrategy>;

  /**
   * An array of custom Query or Mutation SQL commands to the data sources that resolves them.
   * @returns a list of mappings from custom SQL commands to data sources
   */
  readonly customSqlDataSourceStrategies?: CustomSqlDataSourceStrategy[];
}

/**
 * Entry representing the required output from the backend for codegen generate commands to work.
 */
export interface IBackendOutputEntry {
  /**
   * The protocol version for this backend output.
   */
  readonly version: string;

  /**
   * The string-map payload of generated config values.
   */
  readonly payload: Record<string, string>;
}

/**
 * Backend output strategy used to write config required for codegen tasks.
 */
export interface IBackendOutputStorageStrategy {
  /**
   * Add an entry to backend output.
   * @param keyName the key
   * @param backendOutputEntry the record to store in the backend output
   */
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  addBackendOutputEntry(keyName: string, backendOutputEntry: IBackendOutputEntry): void;
}

/**
 * Input props for the AmplifyGraphqlApi construct. Specifies what the input to transform into an Api, and configurations for
 * the transformation process.
 */
export interface AmplifyGraphqlApiProps {
  /**
   * The definition to transform in a full Api.
   * Can be constructed via the AmplifyGraphqlDefinition class.
   */
  readonly definition: IAmplifyGraphqlDefinition;

  /**
   * Name to be used for the AppSync Api.
   * Default: construct id.
   */
  readonly apiName?: string;

  /**
   * Required auth modes for the Api. This object must be a superset of the configured auth providers in the Api definition.
   * For more information, refer to https://docs.amplify.aws/cli/graphql/authorization-rules/
   */
  readonly authorizationModes: AuthorizationModes;

  /**
   * Lambda functions referenced in the definitions's @function directives. The keys of this object are expected to be the
   * function name provided in the definition, and value is the function that name refers to. If a name is not found in this
   * map, then it is interpreted as the `functionName`, and an arn will be constructed using the current aws account and region
   * (or overridden values, if set in the directive).
   */
  readonly functionNameMap?: Record<string, IFunction>;

  /**
   * Configure conflict resolution on the Api, which is required to enable DataStore Api functionality.
   * For more information, refer to https://docs.amplify.aws/lib/datastore/getting-started/q/platform/js/
   * @deprecated use dataStoreConfiguration instead.
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
   * These custom transformers must be implemented with aws-cdk-lib >=2.129.0, and @aws-amplify/graphql-transformer-core >= 2.1.1
   * @experimental
   */
  readonly transformerPlugins?: any[];

  /**
   * If using predictions, a bucket must be provided which will be used to search for assets.
   */
  readonly predictionsBucket?: IBucket;

  /**
   * This replaces feature flags from the Api construct, for general information on what these parameters do,
   * refer to https://docs.amplify.aws/cli/reference/feature-flags/#graphQLTransformer
   */
  readonly translationBehavior?: PartialTranslationBehavior;

  /**
   * Strategy to store construct outputs. If no outputStorageStrategey is provided a default strategy will be used.
   */
  readonly outputStorageStrategy?: IBackendOutputStorageStrategy;

  /**
   * Configure DataStore conflict resolution on the Api. Conflict resolution is required to enable DataStore Api functionality.
   * For more information, refer to https://docs.amplify.aws/lib/datastore/getting-started/q/platform/js/
   */
  readonly dataStoreConfiguration?: DataStoreConfiguration;
}

/**
 * L1 CDK resources from the Api which were generated as part of the transform.
 * These are potentially stored under nested stacks, but presented organized by type instead.
 */
export interface AmplifyGraphqlApiCfnResources {
  /**
   * The Generated AppSync Api L1 Resource
   */
  readonly cfnGraphqlApi: CfnGraphQLApi;

  /**
   * The Generated AppSync Schema L1 Resource
   */
  readonly cfnGraphqlSchema: CfnGraphQLSchema;

  /**
   * The Generated AppSync Api Key L1 Resource
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
   * The Generated Amplify DynamoDb Table L1 resource wrapper, keyed by model type name.
   */
  readonly amplifyDynamoDbTables: Record<string, AmplifyDynamoDbTableWrapper>;

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
 * Accessible resources from the Api which were generated as part of the transform.
 * These are potentially stored under nested stacks, but presented organized by type instead.
 */
export interface AmplifyGraphqlApiResources {
  /**
   * The Generated AppSync Api L2 Resource, includes the Schema.
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
   * Nested Stacks generated by the Api Construct.
   */
  readonly nestedStacks: Record<string, NestedStack>;
}

/**
 * Input type properties when adding a new appsync.AppsyncFunction to the generated API.
 * This is equivalent to the Omit<appsync.AppsyncFunctionProps, 'api'>.
 */
export interface AddFunctionProps {
  /**
   * the data source linked to this AppSync Function
   */
  readonly dataSource: BaseDataSource;

  /**
   * the name of the AppSync Function
   */
  readonly name: string;

  /**
   * the description for this AppSync Function
   *
   * @default - no description
   */
  readonly description?: string;

  /**
   * the request mapping template for the AppSync Function
   *
   * @default - no request mapping template
   */
  readonly requestMappingTemplate?: MappingTemplate;

  /**
   * the response mapping template for the AppSync Function
   *
   * @default - no response mapping template
   */
  readonly responseMappingTemplate?: MappingTemplate;

  /**
   * The functions runtime
   *
   * @default - no function runtime, VTL mapping templates used
   */
  readonly runtime?: FunctionRuntime;

  /**
   * The function code
   *
   * @default - no code is used
   */
  readonly code?: Code;
}

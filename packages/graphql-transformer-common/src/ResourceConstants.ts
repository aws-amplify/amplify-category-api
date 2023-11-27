export class ResourceConstants {
  public static NONE = 'NONE';

  public static DEFAULT_PAGE_LIMIT = 100;

  public static DEFAULT_SYNC_QUERY_PAGE_LIMIT = 100;

  public static DEFAULT_SEARCHABLE_PAGE_LIMIT = 100;

  public static readonly RESOURCES = {
    // AppSync
    GraphQLAPILogicalID: 'GraphQLAPI',
    GraphQLSchemaLogicalID: 'GraphQLSchema',
    APIKeyLogicalID: 'GraphQLAPIKey',
    AuthRolePolicy: 'AuthRolePolicy',
    UnauthRolePolicy: 'UnauthRolePolicy',

    // Elasticsearch
    ElasticsearchAccessIAMRoleLogicalID: 'ElasticSearchAccessIAMRole',
    ElasticsearchDomainLogicalID: 'ElasticSearchDomain',
    ElasticsearchStreamingLambdaIAMRoleLogicalID: 'ElasticSearchStreamingLambdaIAMRole',
    ElasticsearchStreamingLambdaFunctionLogicalID: 'ElasticSearchStreamingLambdaFunction',
    ElasticsearchDataSourceLogicalID: 'ElasticSearchDataSource',

    // OpenSearch
    OpenSearchAccessIAMRoleLogicalID: 'OpenSearchAccessIAMRole',
    OpenSearchDomainLogicalID: 'OpenSearchDomain',
    OpenSearchStreamingLambdaIAMRoleLogicalID: 'OpenSearchStreamingLambdaIAMRole',
    OpenSearchStreamingLambdaFunctionLogicalID: 'OpenSearchStreamingLambdaFunction',
    OpenSearchDataSourceLogicalID: 'OpenSearchDataSource',

    // SQL Lambda
    /** The alias created if a customer specifies a provisioned concurrency configuration */
    SQLLambdaAliasLogicalID: 'SQLLambdaAlias',

    /** The SQL Lambda execution role */
    SQLLambdaIAMRoleLogicalID: 'SQLLambdaIAMRole',

    /**
     * The inline policy attached SQL Lambda execution role. Despite the name, this policy grants not only log access, but also read access
     * to SSM so the Lambda can retrieve database connection parameters.
     */
    SQLLambdaLogAccessPolicy: 'SQLLambdaLogAccessPolicy',

    /** The function that actually makes SQL requests to the backing database */
    SQLLambdaLogicalID: 'SQLLambdaFunction',

    /** The name of the stack holding the SQL Lambda and associated resources */
    SQLStackName: 'SqlApiStack',

    /**
     * A prefix for VPC service endpoints that allow the SQL Lambda to retrieve SSM parameters without sending traffic to the public SSM
     * endpoints.
     */
    SQLVpcEndpointLogicalIDPrefix: 'SQLVpcEndpoint',

    // SQL AppSync DataSource
    SQLLambdaDataSourceLogicalID: 'SQLLambdaDataSource',

    // SQL Patching Lambda
    /** The patching Lambda execution role */
    SQLPatchingLambdaIAMRoleLogicalID: 'SQLPatchingLambdaIAMRole',

    /**
     * The inline policy of the patching Lambda execution role. Despite the name, this policy also grants UpdateFunctionConfiguration on the
     * SQL Lambda, and allows the patching Lambda to get current layer versions of the SQL Lambda Layer.
     */
    SQLPatchingLambdaLogAccessPolicy: 'SQLPatchingLambdaLogAccessPolicy',

    /**
     * The patching Lambda function. When triggered by messages on the SQLPatchingTopic, this function updates the SQL Lambda with the
     * latest version of the SQL Lambda Layer.
     */
    SQLPatchingLambdaLogicalID: 'SQLPatchingLambda',

    /** The customer subscription to the Amplify Notification Topic */
    SQLPatchingSubscriptionLogicalID: 'SQLPatchingSubscription',

    /** The CDK logical ID of the topic imported from the Amplify Notification Topic ARN */
    SQLPatchingTopicLogicalID: 'SQLPatchingTopic',

    /**
     * The topic name to which Amplify publishes new layer notification messages. Amplify subscribes customers to this topic, which triggers
     * the patching Lambda to update lambda versions when the new layer is published.
     *
     * DO NOT CHANGE THIS VALUE. It is a well-known value shared amongst multiple components of the patching infrastructure.
     */
    AmplifySQLLayerNotificationTopicName: 'AmplifySQLLayerNotification',

    /**
     * The Amplify AWS account that owns the Amplify Notification Topic
     *
     * DO NOT CHANGE THIS VALUE. It is a well-known value shared amongst multiple components of the patching infrastructure.
     */
    AmplifySQLLayerNotificationTopicAccount: '582037449441',

    // Lambda Layer version resolution. LayerVersion ARNs are stored at `{bucket}/{prefix}{region}`, as in:
    // `amplify-rds-layer-resources/sql-layer-versions/us-west-2`

    /**
     * The bucket name where the manifest files are stored.
     */
    SQLLayerVersionManifestBucket: 'amplify-rds-layer-resources',

    /**
     * The region in which the version manifest bucket was created.
     */
    SQLLayerVersionManifestBucketRegion: 'us-east-1',

    /** The prefix of the manifest file */
    SQLLayerVersionManifestKeyPrefix: 'sql-layer-versions/',

    /** The Lambda LayerVersion of the latest SQL Lambda that manages connections and SQL requests to the backing database */
    SQLLambdaLayerVersionLogicalID: 'SQLLambdaLayerVersion',

    // Gen 1 CLI fetches the latest layer mapping at runtime and stores it in a CfnMapping in the stack

    /**
     * A mapping that stores LayerVersion ARNs by region. The resource generator has a hardcoded map of versions that is kept up to date as
     * Amplify publishes new layer versions. This hardcoded map is used during initial deployment, but the layer version will be updated by
     * the patching Lambda as new versions are published.
     */
    SQLLayerMappingID: 'SQLLayerResourceMapping',

    // CDK Construct uses a custom resource to retrieve the latest version from S3 during CDK deployment

    /** The CDK name of Lambda LayerVersion custom resource */
    SQLLayerVersionCustomResourceID: 'SQLLayerVersionCustomResource',

    // Local. Try not to collide with model data sources.
    NoneDataSource: 'NoneDataSource',

    // Auth
    AuthCognitoUserPoolLogicalID: 'AuthCognitoUserPool',
    AuthCognitoUserPoolNativeClientLogicalID: 'AuthCognitoUserPoolNativeClient',
    AuthCognitoUserPoolJSClientLogicalID: 'AuthCognitoUserPoolJSClient',

    // Amplify Table Manager
    TableManagerOnEventHandlerLogicalID: 'TableManagerOnEventHandler',
    TableManagerIsCompleteHandlerLogicalID: 'TableManagerIsCompleteHandler',
    TableManagerCustomProviderLogicalID: 'TableManagerCustomProvider',
  };

  public static PARAMETERS = {
    // cli
    Env: 'env',
    S3DeploymentBucket: 'S3DeploymentBucket',
    S3DeploymentRootKey: 'S3DeploymentRootKey',

    // AppSync
    AppSyncApiName: 'AppSyncApiName',
    AppSyncApiId: 'AppSyncApiId',
    CreateAPIKey: 'CreateAPIKey',
    AuthRoleName: 'authRoleName',
    UnauthRoleName: 'unauthRoleName',
    APIKeyExpirationEpoch: 'APIKeyExpirationEpoch',

    // DynamoDB
    DynamoDBBillingMode: 'DynamoDBBillingMode',
    DynamoDBModelTableReadIOPS: 'DynamoDBModelTableReadIOPS',
    DynamoDBModelTableWriteIOPS: 'DynamoDBModelTableWriteIOPS',
    DynamoDBEnablePointInTimeRecovery: 'DynamoDBEnablePointInTimeRecovery',
    DynamoDBEnableServerSideEncryption: 'DynamoDBEnableServerSideEncryption',

    // Elasticsearch
    ElasticsearchAccessIAMRoleName: 'ElasticSearchAccessIAMRoleName',
    ElasticsearchDebugStreamingLambda: 'ElasticSearchDebugStreamingLambda',
    ElasticsearchStreamingIAMRoleName: 'ElasticSearchStreamingIAMRoleName',
    ElasticsearchStreamingFunctionName: 'ElasticSearchStreamingFunctionName',
    ElasticsearchStreamBatchSize: 'ElasticSearchStreamBatchSize',
    ElasticsearchStreamMaximumBatchingWindowInSeconds: 'ElasticSearchStreamMaximumBatchingWindowInSeconds',
    ElasticsearchInstanceCount: 'ElasticSearchInstanceCount',
    ElasticsearchInstanceType: 'ElasticSearchInstanceType',
    ElasticsearchEBSVolumeGB: 'ElasticSearchEBSVolumeGB',
    ElasticsearchStreamingLambdaHandlerName: 'ElasticSearchStreamingLambdaHandlerName',
    ElasticsearchStreamingLambdaRuntime: 'ElasticSearchStreamingLambdaRuntime',

    // OpenSearch
    OpenSearchAccessIAMRoleName: 'OpenSearchAccessIAMRoleName',
    OpenSearchDebugStreamingLambda: 'OpenSearchDebugStreamingLambda',
    OpenSearchStreamingIAMRoleName: 'OpenSearchStreamingIAMRoleName',
    OpenSearchStreamingFunctionName: 'OpenSearchStreamingFunctionName',
    OpenSearchStreamBatchSize: 'OpenSearchStreamBatchSize',
    OpenSearchStreamMaximumBatchingWindowInSeconds: 'OpenSearchStreamMaximumBatchingWindowInSeconds',
    OpenSearchInstanceCount: 'OpenSearchInstanceCount',
    OpenSearchInstanceType: 'OpenSearchInstanceType',
    OpenSearchEBSVolumeGB: 'OpenSearchEBSVolumeGB',
    OpenSearchStreamingLambdaHandlerName: 'OpenSearchStreamingLambdaHandlerName',
    OpenSearchStreamingLambdaRuntime: 'OpenSearchStreamingLambdaRuntime',

    // Auth
    AuthCognitoUserPoolId: 'AuthCognitoUserPoolId',
  };

  public static MAPPINGS = {};

  public static CONDITIONS = {
    // Environment
    HasEnvironmentParameter: 'HasEnvironmentParameter',

    // DynamoDB
    ShouldUsePayPerRequestBilling: 'ShouldUsePayPerRequestBilling',
    ShouldUsePointInTimeRecovery: 'ShouldUsePointInTimeRecovery',
    ShouldUseServerSideEncryption: 'ShouldUseServerSideEncryption',

    // Auth
    ShouldCreateAPIKey: 'ShouldCreateAPIKey',
    APIKeyExpirationEpochIsPositive: 'APIKeyExpirationEpochIsPositive',
  };

  public static OUTPUTS = {
    // AppSync
    GraphQLAPIEndpointOutput: 'GraphQLAPIEndpointOutput',
    GraphQLAPIApiKeyOutput: 'GraphQLAPIKeyOutput',
    GraphQLAPIIdOutput: 'GraphQLAPIIdOutput',

    // Elasticsearch
    ElasticsearchStreamingLambdaIAMRoleArn: 'ElasticsearchStreamingLambdaIAMRoleArn',
    ElasticsearchAccessIAMRoleArn: 'ElasticsearchAccessIAMRoleArn',
    ElasticsearchDomainArn: 'ElasticsearchDomainArn',
    ElasticsearchDomainEndpoint: 'ElasticsearchDomainEndpoint',

    // OpenSearch
    OpenSearchStreamingLambdaIAMRoleArn: 'OpenSearchStreamingLambdaIAMRoleArn',
    OpenSearchAccessIAMRoleArn: 'OpenSearchAccessIAMRoleArn',
    OpenSearchDomainArn: 'OpenSearchDomainArn',
    OpenSearchDomainEndpoint: 'OpenSearchDomainEndpoint',

    // Auth
    AuthCognitoUserPoolIdOutput: 'AuthCognitoUserPoolIdOutput',
    AuthCognitoUserPoolNativeClientOutput: 'AuthCognitoUserPoolNativeClientId',
    AuthCognitoUserPoolJSClientOutput: 'AuthCognitoUserPoolJSClientId',
  };

  public static METADATA = {};

  public static readonly SNIPPETS = {
    AuthCondition: 'authCondition',
    AuthMode: 'authMode',
    VersionedCondition: 'versionedCondition',
    ModelObjectKey: 'modelObjectKey',
    DynamoDBNameOverrideMap: 'dynamodbNameOverrideMap',
    ModelQueryExpression: 'modelQueryExpression',
    ModelQueryIndex: 'modelQueryIndex',
    IsDynamicGroupAuthorizedVariable: 'isDynamicGroupAuthorized',
    IsLocalDynamicGroupAuthorizedVariable: 'isLocalDynamicGroupAuthorized',
    IsStaticGroupAuthorizedVariable: 'isStaticGroupAuthorized',
    IsOwnerAuthorizedVariable: 'isOwnerAuthorized',
    IsLocalOwnerAuthorizedVariable: 'isLocalOwnerAuthorized',
    SyncResolverKey: 'syncResolverKey',
    HasSeenSomeKeyArg: 'hasSeenSomeKeyArg',
  };
}

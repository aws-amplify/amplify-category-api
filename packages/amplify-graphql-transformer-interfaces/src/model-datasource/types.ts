// #########################################################################################################################################
// If you change types in this file (the internal implementation), be sure to make corresponding necessary changes to
// amplify-graphql-api-construct/src/model-datasource-strategy.ts (the customer-facing interface) and the adapter functions in this file.
// #########################################################################################################################################

/**
 * All known ModelDataSourceStrategies. Concrete strategies vary widely in their requirements and implementations.
 */
export type ModelDataSourceStrategy =
  | DefaultDynamoDbModelDataSourceStrategy
  | AmplifyDynamoDbModelDataSourceStrategy
  | SQLLambdaModelDataSourceStrategy;

export interface ModelDataSourceStrategyBase {
  dbType: ModelDataSourceStrategyDbType;
}

/**
 * All supported database types that can be used to resolve models.
 */
export type ModelDataSourceStrategyDbType = 'DYNAMODB' | ModelDataSourceStrategySqlDbType;

/**
 * All supported SQL database types that can be used to resolve models.
 */
export type ModelDataSourceStrategySqlDbType = 'MYSQL' | 'POSTGRES';

/**
 * Use default CloudFormation type 'AWS::DynamoDB::Table' to provision table.
 */
export interface DefaultDynamoDbModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'DEFAULT';
}

/**
 * Use custom resource type 'Custom::AmplifyDynamoDBTable' to provision table.
 */
export interface AmplifyDynamoDbModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'AMPLIFY_TABLE';
}

/**
 * A strategy that creates a Lambda to connect to a pre-existing SQL table to resolve model data.
 *
 * Note: The implementation type is different from the interface type: the interface type contains the custom SQL statements that are
 * reference by the `@sql` `reference` attribute, while the implementation moves those into the SqlDirectiveDataSourceStrategy type.
 */
export interface SQLLambdaModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  /**
   * The name of the strategy. This will be used to name the AppSync DataSource itself, plus any associated resources like resolver Lambdas.
   * This name must be unique across all schema definitions in a GraphQL API.
   */
  readonly name: string;

  /**
   * The type of the SQL database used to process model operations for this definition.
   */
  readonly dbType: ModelDataSourceStrategySqlDbType;

  /**
   * The parameters the Lambda data source will use to connect to the database.
   */
  readonly dbConnectionConfig: SqlModelDataSourceDbConnectionConfig;

  /**
   * The configuration of the VPC into which to install the Lambda.
   */
  readonly vpcConfiguration?: VpcConfig;

  /**
   * The configuration for the provisioned concurrency of the Lambda.
   */
  readonly sqlLambdaProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfig;
}

/**
 * Configuration of the VPC in which to install a Lambda to resolve queries against a SQL-based data source. The SQL Lambda will be deployed
 * into the specified VPC, subnets, and security groups. The specified subnets and security groups must be in the same VPC. The VPC must
 * have at least one subnet. The construct will also create VPC service endpoints in the specified subnets, as well as inbound security
 * rules, to allow traffic on port 443 within each security group. This allows the Lambda to read database connection information from
 * Secure Systems Manager.
 */
export interface VpcConfig {
  /** The VPC to install the Lambda data source in. */
  readonly vpcId: string;

  /** The security groups to install the Lambda data source in. */
  readonly securityGroupIds: string[];

  /** The subnets to install the Lambda data source in, one per availability zone. */
  readonly subnetAvailabilityZoneConfig: SubnetAvailabilityZone[];
}

/**
 * The configuration for the provisioned concurrency of the Lambda.
 */
export interface ProvisionedConcurrencyConfig {
  /** The amount of provisioned concurrency to allocate. **/
  readonly provisionedConcurrentExecutions: number;
}

/**
 * Subnet configuration for VPC endpoints used by a Lambda resolver for a SQL-based data source. Although it is possible to create multiple
 * subnets in a single availability zone, VPC service endpoints may only be deployed to a single subnet in a given availability zone. This
 * structure ensures that the Lambda function and VPC service endpoints are mutually consistent.
 */
export interface SubnetAvailabilityZone {
  /** The subnet ID to install the Lambda data source in. */
  readonly subnetId: string;

  /** The availability zone of the subnet. */
  readonly availabilityZone: string;
}

/*
 * The credentials the lambda data source will use to connect to the database.
 *
 * @experimental
 */
export type SqlModelDataSourceDbConnectionConfig =
  | SqlModelDataSourceSecretsManagerDbConnectionConfig
  | SqlModelDataSourceSsmDbConnectionConfig
  | SqlModelDataSourceSsmDbConnectionStringConfig;

/**
 * Marker interface. Although we can't declare it in the actual interface definition because it results in invalid C#, each conforming type
 * must have a `configType: string` field to allow for discriminated union behavior.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SslCertConfig {}

export interface SslCertSsmPathConfig extends SslCertConfig {
  /**
   * The SSM path to a custom SSL certificate to use instead of the default. Amplify resolves the trust store to use as follows:
   * - If the `ssmPath` parameter is provided, use it.
   *   - If the parameter is a single string, use it.
   *   - If the parameter is an array, iterate over them in order
   *   - In either case, if the parameter is provided but the certificate content isn't retrievable, fails with an error.
   * - If the database host is an RDS cluster, instance, or proxy (in other words, if the database host ends with "rds.amazonaws.com"), use
   *   an RDS-specific trust store vended by AWS. See
   *   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.CertificatesAllRegions
   * - Otherwise, use the trust store vended with the NodeJS runtime version that the SQL lambda is running on
   */
  readonly ssmPath: string | string[];
}

/**
 * The configuration option to use a Secure Systems Manager parameter to store the connection string to the database.
 * @experimental
 */
export interface SqlModelDataSourceSsmDbConnectionStringConfig {
  /** The SSM Path to the secure connection string used for connecting to the database. **/
  readonly connectionUriSsmPath: string | string[];

  /**
   * An optional configuration for a custom SSL certificate authority to use when connecting to the database.
   */
  readonly sslCertConfig?: SslCertConfig;
}

/*
 * The credentials stored in Secrets Manager that the lambda data source will use to connect to the database.
 *
 * The managed secret should be in the same region as the lambda.
 * @experimental
 */
export interface SqlModelDataSourceSecretsManagerDbConnectionConfig {
  /** The arn of the managed secret with username, password, and hostname to use when connecting to the database. **/
  readonly secretArn: string;

  /**
   * The ARN of the customer managed encryption key for the secret. If not supplied, the secret is expected to be encrypted with the default
   * AWS-managed key.
   **/
  readonly keyArn?: string;

  /** port number of the database proxy, cluster, or instance. */
  readonly port: number;

  /** database name. */
  readonly databaseName: string;

  /** The hostname of the database. */
  readonly hostname: string;

  /**
   * An optional configuration for a custom SSL certificate authority to use when connecting to the database.
   */
  readonly sslCertConfig?: SslCertConfig;
}

/**
 * The Secure Systems Manager parameter paths the Lambda data source will use to connect to the database.
 *
 * These parameters are retrieved from Secure Systems Manager in the same region as the Lambda.
 * @experimental
 */
export interface SqlModelDataSourceSsmDbConnectionConfig {
  /** The Secure Systems Manager parameter containing the hostname of the database. For RDS-based SQL data sources, this can be the hostname
   * of a database proxy, cluster, or instance.
   */
  readonly hostnameSsmPath: string;

  /** The Secure Systems Manager parameter containing the port number of the database proxy, cluster, or instance. */
  readonly portSsmPath: string;

  /** The Secure Systems Manager parameter containing the username to use when connecting to the database. */
  readonly usernameSsmPath: string;

  /** The Secure Systems Manager parameter containing the password to use when connecting to the database. */
  readonly passwordSsmPath: string;

  /** The Secure Systems Manager parameter containing the database name. */
  readonly databaseNameSsmPath: string;

  /**
   * An optional configuration for a custom SSL certificate authority to use when connecting to the database.
   */
  readonly sslCertConfig?: SslCertConfig;
}

/**
 * The internal implementation type for defining a ModelDataSourceStrategy used to resolve a field annotated with a `@sql` directive.
 *
 * Note: The implementation type is different from the interface type: it directly contains the SQL statement to be executed rather than
 * passing a map.
 */
export interface SqlDirectiveDataSourceStrategy {
  /** The built-in type (either "Query" or "Mutation") with which the custom SQL is associated */
  readonly typeName: 'Query' | 'Mutation';

  /** The field name with which the custom SQL is associated */
  readonly fieldName: string;

  /** The strategy used to create the datasource that will resolve the custom SQL statement. */
  readonly strategy: SQLLambdaModelDataSourceStrategy;

  /**
   * Custom SQL statements to be executed to resolve this field.
   *
   * Note: It's overkill to make this a map: a SqlDirectiveDataSourceStrategy will only ever use at most one statement (and maybe not even
   * that if the directive uses inline statements). However, to avoid having to parse the directive configuration in multiple places, we'll
   * pass the entire map as specified in the CDK construct definition, and let the directive transformer use it to look up references.
   */
  readonly customSqlStatements?: Record<string, string>;
}

/**
 * Defines types that vend a dataSourceStrategies and optional customSqlDataSourceStrategies field. Primarily used for transformer context.
 */
export interface DataSourceStrategiesProvider {
  /** Maps GraphQL model names to the ModelDataSourceStrategy used to resolve it. The key of the record is the GraphQL type name. */
  dataSourceStrategies: Record<string, ModelDataSourceStrategy>;

  /** Maps custom Query and Mutation fields to the ModelDataSourceStrategy used to resolve them. */
  sqlDirectiveDataSourceStrategies?: SqlDirectiveDataSourceStrategy[];
}

/**
 * Maps a given AWS region to the SQL Lambda layer version ARN for that region. TODO: Once we remove SQL imports from Gen1 CLI, remove this
 * from the transformer interfaces package in favor of the model generator, which is the only place that needs it now that we always resolve
 * the layer mapping at deploy time.
 */
export interface RDSLayerMapping {
  readonly [key: string]: {
    layerRegion: string;
  };
}

/**
 * Maps a given AWS region to the SQL SNS topic ARN for that region. TODO: Once we remove SQL imports from Gen1 CLI, remove this
 * from the transformer interfaces package in favor of the model generator, which is the only place that needs it now that we always resolve
 * the layer mapping at deploy time.
 */
export interface RDSSNSTopicMapping {
  readonly [key: string]: {
    topicArn: string;
  };
}

/**
 * Defines types that vend an rdsLayerMapping field. This is used solely for the Gen1 CLI import API flow, since wiring the custom resource
 * provider used by the CDK isn't worth the cost. TODO: Remove this once we remove SQL imports from Gen1 CLI.
 */
export interface RDSLayerMappingProvider {
  rdsLayerMapping?: RDSLayerMapping;
}

/**
 * Defines types that vend an rdsSnsTopicMapping field. This is used solely for the Gen1 CLI import API flow, since wiring the custom resource
 * provider used by the CDK isn't worth the cost. TODO: Remove this once we remove SQL imports from Gen1 CLI.
 */
export interface RDSSNSTopicMappingProvider {
  rdsSnsTopicMapping?: RDSSNSTopicMapping;
}

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceDbConnectionConfig.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceDbConnectionConfig
 */
export const isSqlModelDataSourceDbConnectionConfig = (obj: any): obj is SqlModelDataSourceDbConnectionConfig => {
  return isSqlModelDataSourceSsmDbConnectionConfig(obj) || isSqlModelDataSourceSecretsManagerDbConnectionConfig(obj);
};

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceSsmDbConnectionConfig.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceDbConnectionConfig
 */
export const isSqlModelDataSourceSsmDbConnectionConfig = (obj: any): obj is SqlModelDataSourceSsmDbConnectionConfig => {
  return (
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.hostnameSsmPath === 'string' &&
    typeof obj.portSsmPath === 'string' &&
    typeof obj.usernameSsmPath === 'string' &&
    typeof obj.passwordSsmPath === 'string' &&
    typeof obj.databaseNameSsmPath === 'string'
  );
};

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceSecretsManagerDbConnectionConfig.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceDbConnectionConfig
 */
export const isSqlModelDataSourceSecretsManagerDbConnectionConfig = (
  obj: any,
): obj is SqlModelDataSourceSecretsManagerDbConnectionConfig => {
  return (
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.secretArn === 'string' &&
    typeof obj.port === 'number' &&
    typeof obj.databaseName === 'string' &&
    typeof obj.hostname === 'string'
  );
};

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceSsmDbConnectionStringConfig.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceSsmDbConnectionStringConfig
 */
export const isSqlModelDataSourceSsmDbConnectionStringConfig = (obj: any): obj is SqlModelDataSourceSsmDbConnectionStringConfig => {
  return (
    (typeof obj === 'object' || typeof obj === 'function') &&
    (typeof obj.connectionUriSsmPath === 'string' || Array.isArray(obj.connectionUriSsmPath))
  );
};

export const isSslCertSsmPathConfig = (obj: any): obj is SslCertSsmPathConfig =>
  obj && typeof obj === 'object' && 'ssmPath' in obj && (Array.isArray(obj.ssmPath) || typeof obj.ssmPath === 'string');

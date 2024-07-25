// #########################################################################################################################################
// These are the public-facing types used by customers to define their L3 CDK construct. Many of these have corresponding definitions in the
// transformer-interfaces package to define internal behavior.
//
// If you change types in this file (the customer-facing interface), be sure to make corresponding changes to
// amplify-graphql-transformer-interfaces/src/model-datasource (the internal implementation)
// #########################################################################################################################################

/**
 * All known ModelDataSourceStrategies. Concrete strategies vary widely in their requirements and implementations.
 */
export type ModelDataSourceStrategy =
  | DefaultDynamoDbModelDataSourceStrategy
  | AmplifyDynamoDbModelDataSourceStrategy
  | SQLLambdaModelDataSourceStrategy;

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
export interface DefaultDynamoDbModelDataSourceStrategy {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'DEFAULT';
}

/**
 * Use custom resource type 'Custom::AmplifyDynamoDBTable' to provision table.
 */
export interface AmplifyDynamoDbModelDataSourceStrategy {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'AMPLIFY_TABLE';
}

/**
 * A strategy that creates a Lambda to connect to a pre-existing SQL table to resolve model data.
 */
export interface SQLLambdaModelDataSourceStrategy {
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
   * Custom SQL statements. The key is the value of the `references` attribute of the `@sql` directive in the `schema`; the value is the SQL
   * to be executed.
   */
  readonly customSqlStatements?: Record<string, string>;

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

/**
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
  /**
   * The SSM Path to the secure connection string used for connecting to the database. If more than one path is provided,
   * the SQL Lambda will attempt to retrieve connection information from each path in order until it finds a valid
   * path entry, then stop. If the connection information contained in that path is invalid, the SQL Lambda will not
   * attempt to retrieve connection information from subsequent paths in the array.
   **/
  readonly connectionUriSsmPath: string | string[];

  /**
   * An optional configuration for a custom SSL certificate authority to use when connecting to the database.
   */
  readonly sslCertConfig?: SslCertConfig;
}

/**
 * The credentials stored in Secrets Manager that the lambda data source will use to connect to the database.
 *
 * The managed secret should be in the same region as the lambda.
 * @experimental
 */
export interface SqlModelDataSourceSecretsManagerDbConnectionConfig {
  /** The ARN of the managed secret with username, password, and hostname to use when connecting to the database. **/
  readonly secretArn: string;

  /**
   * The ARN of the customer managed encryption key for the secret. If not supplied, the secret is expected to be encrypted with the default
   * AWS-managed key.
   **/
  readonly keyArn?: string;

  /** The port number of the database proxy, cluster, or instance. */
  readonly port: number;

  /** The database name. */
  readonly databaseName: string;

  /** The hostame of the database. */
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
 * The input type for defining a ModelDataSourceStrategy used to resolve a field annotated with a `@sql` directive. Although this is a
 * public type, you should rarely need to use this. The AmplifyGraphqlDefinition factory methods (e.g., `fromString`,
 * `fromFilesAndStrategy`) will automatically construct this structure for you.
 */
export interface CustomSqlDataSourceStrategy {
  /** The built-in type (either "Query" or "Mutation") with which the custom SQL is associated */
  readonly typeName: 'Query' | 'Mutation';

  /** The field name with which the custom SQL is associated */
  readonly fieldName: string;

  /** The strategy used to create the datasource that will resolve the custom SQL statement. */
  readonly strategy: SQLLambdaModelDataSourceStrategy;
}

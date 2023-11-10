// #########################################################################################################################################
// If you change types in this file (the customer-facing interface), be sure to make corresponding changes to
// graphql-transformer-common/src/model-datasource-strategy.ts (the internal implementation)
// #########################################################################################################################################

/**
 * Supported transformable database types
 * @experimental
 */
export type ModelDataSourceDbType = 'DYNAMODB' | ModelDataSourceSqlDbType;

/**
 * Supported transformable SQL database types.
 * @experimental
 */
export type ModelDataSourceSqlDbType = 'MYSQL' | 'POSTGRES';

/**
 * All known ModelDataSourceStrategies. Concrete strategies vary widely in their requirements and implementations.
 *
 * **NOTE** Each ModelDataSourceStrategy **MUST** contain a `dbType` field of type `ModelDataSourceDbType`. This is not enforceable in the
 * public construct interface, since redeclaring the `dbType` member is invalid JSII because it results in invalid C#.
 *
 * @experimental
 */
export type ModelDataSourceStrategy =
  | DefaultDynamoDbModelDataSourceStrategy
  | AmplifyDynamoDbModelDataSourceStrategy
  | SQLLambdaModelDataSourceStrategy;

/**
 * Use default CloudFormation type 'AWS::DynamoDB::Table' to provision table.
 * @experimental
 */
export interface DefaultDynamoDbModelDataSourceStrategy {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'DEFAULT';
}

/**
 * Use custom resource type 'Custom::AmplifyDynamoDBTable' to provision table.
 * @experimental
 */
export interface AmplifyDynamoDbModelDataSourceStrategy {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'AMPLIFY_TABLE';
}

/**
 * A strategy that creates a Lambda to connect to a pre-existing SQL table to resolve model data.
 *
 * @experimental
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
  readonly dbType: ModelDataSourceSqlDbType;

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
   *
   * **Note:** `@sql` directives may only be added to fields in the `Query` or `Mutation` types, and are not tied to a particular model. See
   * also `CustomSqlDataSourceStrategy`.
   */
  readonly customSqlStatements?: Record<string, string>;

  /**
   * An optional override for the default SQL Lambda Layer
   */
  readonly sqlLambdaLayerMapping?: SQLLambdaLayerMapping;
}

/**
 * Configuration of the VPC in which to install a Lambda to resolve queries against a SQL-based data source. The SQL Lambda will be deployed
 * into the specified VPC, subnets, and security groups. The specified subnets and security groups must be in the same VPC. The VPC must
 * have at least one subnet. The construct will also create VPC service endpoints in the specified subnets, as well as inbound security
 * rules, to allow traffic on port 443 within each security group. This allows the Lambda to read database connection information from
 * Secure Systems Manager.
 * @experimental
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
 * Subnet configuration for VPC endpoints used by a Lambda resolver for a SQL-based data source. Although it is possible to create multiple
 * subnets in a single availability zone, VPC service endpoints may only be deployed to a single subnet in a given availability zone. This
 * structure ensures that the Lambda function and VPC service endpoints are mutually consistent.
 * @experimental
 */
export interface SubnetAvailabilityZone {
  /** The subnet ID to install the Lambda data source in. */
  readonly subnetId: string;

  /** The availability zone of the subnet. */
  readonly availabilityZone: string;
}

/**
 * Maps a given AWS region to the SQL Lambda layer version ARN for that region. `key` is the region; the `value` is the Lambda Layer version
 * ARN
 */
export type SQLLambdaLayerMapping = Record<string, string>;

/**
 * The Secure Systems Manager parameter paths the Lambda data source will use to connect to the database.
 *
 * These parameters are retrieved from Secure Systems Manager in the same region as the Lambda.
 * @experimental
 */
export interface SqlModelDataSourceDbConnectionConfig {
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
}

export interface CustomSqlDataSourceStrategy {
  readonly typeName: 'Query' | 'Mutation';
  readonly fieldName: string;
  readonly strategy: SQLLambdaModelDataSourceStrategy;
}

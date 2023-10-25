import { VpcConfig } from './vpc-config';

/**
 * Defines a DataSource for resolving GraphQL operations against `@model` types in a GraphQL schema.
 * @experimental
 */
export interface ModelDataSourceDefinition {
  /**
   * The name of the ModelDataSource. This will be used to name the AppSynce DataSource itself, plus any associated resources like resolver
   * Lambdas, custom CDK resources. This name must be unique across all schema definitions in a GraphQL API.
   */
  readonly name: string;

  /**
   * The ModelDataSourceDefinitionStrategy.
   */
  readonly strategy: ModelDataSourceDefinitionStrategy;
}

/**
 * All known ModelDataSourceDefinitionStrategies. Concrete strategies vary widely in their requirements and implementations.
 * @experimental
 */
export type ModelDataSourceDefinitionStrategy =
  | DefaultDynamoDbModelDataSourceDefinitionStrategy
  | AmplifyDynamoDbModelDataSourceDefinitionStrategy
  | SQLLambdaModelDataSourceDefinitionStrategy;

export type ModelDataSourceDefinitionDbType = 'DYNAMODB' | 'MYSQL' | 'POSTGRES';

/**
 * Use default CloudFormation type 'AWS::DynamoDB::Table' to provision table.
 * @experimental
 */
export interface DefaultDynamoDbModelDataSourceDefinitionStrategy {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'DEFAULT';
}

/**
 * Use custom resource type 'Custom::AmplifyDynamoDBTable' to provision table.
 * @experimental
 */
export interface AmplifyDynamoDbModelDataSourceDefinitionStrategy {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'AMPLIFY_TABLE';
}

/**
 * A definition that creates a Lambda to connect to a pre-existing SQL table to resolve model data.
 *
 * @experimental
 */
export interface SQLLambdaModelDataSourceDefinitionStrategy {
  /**
   * The type of the SQL database used to process model operations for this definition.
   */
  readonly dbType: 'MYSQL' | 'POSTGRES';

  /**
   * The parameters the Lambda will use to connect to the database.
   */
  readonly dbConnectionConfig: SqlModelDataSourceDefinitionDbConnectionConfig;

  /**
   * The configuration of the VPC into which to install the Lambda. If specified, Amplify will also create VPC service endpoints to allow
   * the Lambda to retrieve connection parameters from Secure Systems Manager (SSM). If not specified, Amplify will not create any VPC
   * service endpoints, and will connect to SSM public endpoints.
   *
   * In order to connect to an RDS Proxy, the Lambda MUST be installed into a VPC. If it is not installed into the same VPC as the proxy
   * itself, you must establish connectivity between the Lambda's VPC and the RDS Proxy's VPC (e.g., via Proxy Peering).
   */
  readonly vpcConfiguration?: VpcConfig;

  /**
   * Custom SQL statements. The key is the value of the `references` attribute of the `@sql` directive in the `schema`; the value is the SQL
   * to be executed.
   */
  readonly customSqlStatements?: Record<string, string>;

  /**
   * An optional override for the default SQL Lambda Layer.
   */
  readonly sqlLambdaLayerMapping?: SQLLambdaLayerMapping;
}

/**
 * The Secure Systems Manager parameter paths the Lambda data source will use to connect to the database.
 *
 * These parameters are retrieved from Secure Systems Manager in the same region as the Lambda.
 * @experimental
 */
export interface SqlModelDataSourceDefinitionDbConnectionConfig {
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

/**
 * Maps a given AWS region to the SQL Lambda layer version ARN for that region.
 */
export type SQLLambdaLayerMapping = {
  [key: string]: {
    layerRegion: string;
  };
};

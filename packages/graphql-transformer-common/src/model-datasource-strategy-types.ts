// #########################################################################################################################################
// If you change types in this file (the internal implementation), be sure to make corresponding necessary changes to
// amplify-graphql-api-construct/src/model-datasource-strategy.ts (the customer-facing interface) and the adapter functions in this file.
// #########################################################################################################################################

/**
 * Supported transformable database types
 */
export type ModelDataSourceDbType = 'DYNAMODB' | ModelDataSourceSqlDbType;

/**
 * Supported transformable SQL database types.
 */
export type ModelDataSourceSqlDbType = 'MYSQL' | 'POSTGRES';

/**
 * An implementation-only interface to enforces that all ModelDataSourceStrategies must contain a `dbType` field that we can use to control
 * transformer behavior. This type is not part of the public construct interface, since redeclaring the `dbType` member is invalid JSII
 * because it results in invalid C#.
 */
export interface ModelDataSourceStrategyBase {
  readonly dbType: ModelDataSourceDbType;
}

export type ModelDataSourceStrategy =
  | DefaultDynamoDbModelDataSourceStrategy
  | AmplifyDynamoDbModelDataSourceStrategy
  | SQLLambdaModelDataSourceStrategy;

export interface DefaultDynamoDbModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'DEFAULT';
}

export interface AmplifyDynamoDbModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'AMPLIFY_TABLE';
}

export interface SQLLambdaModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  readonly name: string;
  readonly dbType: ModelDataSourceSqlDbType;
  readonly dbConnectionConfig: SqlModelDataSourceDbConnectionConfig;
  readonly vpcConfiguration?: VpcConfig;
  readonly customSqlStatements?: Record<string, string>;
  readonly sqlLambdaLayerMapping?: SQLLambdaLayerMapping;
}

/**
 * Utility type used only for schemas generated during the CLI flow, since some information has to be fulfilled in the transformer. CDK
 * flows will never use this type, since all information is provided in the construct definitions.
 */
export interface PartialSQLLambdaModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  readonly name: string;
  readonly dbType: ModelDataSourceSqlDbType;
  readonly customSqlStatements?: Record<string, string>;
}

export interface VpcConfig {
  readonly vpcId: string;
  readonly securityGroupIds: string[];
  readonly subnetAvailabilityZoneConfig: SubnetAvailabilityZone[];
}

export interface SubnetAvailabilityZone {
  readonly subnetId: string;
  readonly availabilityZone: string;
}

// TODO: Normalize Layer mapping between RDSLayerMapping and SQLLambdaLayerMapping
export type SQLLambdaLayerMapping = Record<string, string>;

/**
 * Maps a given AWS region to the SQL Lambda layer version ARN for that region. This shape isn't jsii compatible since it doesn't have known
 * keys.
 */
export interface RDSLayerMapping {
  readonly [key: string]: {
    layerRegion: string;
  };
}

export interface SqlModelDataSourceDbConnectionConfig {
  readonly hostnameSsmPath: string;
  readonly portSsmPath: string;
  readonly usernameSsmPath: string;
  readonly passwordSsmPath: string;
  readonly databaseNameSsmPath: string;
}

export interface CustomSqlDataSourceStrategy {
  typeName: 'Query' | 'Mutation';
  fieldName: string;
  strategy: SQLLambdaModelDataSourceStrategy | PartialSQLLambdaModelDataSourceStrategy;
}

export interface DataSourceStrategiesProvider {
  /** Maps GraphQL model names to the ModelDataSourceStrategy used to resolve it. The key of the record is the GraphQL type name. */
  dataSourceStrategies: Record<string, ModelDataSourceStrategy>;
  /** Maps custom Query and Mutation fields to the ModelDataSourceStrategy used to resolve them. */
  customSqlDataSourceStrategies: CustomSqlDataSourceStrategy[];
}

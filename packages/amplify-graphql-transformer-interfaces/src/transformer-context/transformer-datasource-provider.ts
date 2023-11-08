import { BackedDataSource, HttpDataSource } from 'aws-cdk-lib/aws-appsync';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { CfnDomain } from 'aws-cdk-lib/aws-elasticsearch';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';

export enum AppSyncDataSourceType {
  AMAZON_DYNAMODB = 'AMAZON_DYNAMODB',
  AMAZON_ELASTICSEARCH = 'AMAZON_ELASTICSEARCH',
  AWS_LAMBDA = 'AWS_LAMBDA',
  RELATIONAL_DATABASE = 'RELATIONAL_DATABASE',
  HTTP = 'HTTP',
  NONE = 'NONE',
}

export interface NoneDataSourceProvider {
  readonly name: string;
}

export type DataSourceInstance = ITable | CfnDomain | HttpDataSource | IFunction | NoneDataSourceProvider;

export interface TransformerDataSourceManagerProvider {
  add: (type: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode, dataSourceInstance: DataSourceInstance) => void;
  get: (type: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) => DataSourceInstance;
  has: (name: string) => boolean;
}

export interface DataSourceProvider extends BackedDataSource {}

/**
 * Supported transformable database types.
 */
export type DBType = 'DDB' | 'MySQL' | 'Postgres';

/**
 * Configuration for a datasource. Defines the underlying database engine, and instructs the tranformer whether to provision the database
 * storage or whether it already exists.
 */
export const enum DynamoDBProvisionStrategy {
  /**
   * Use default cloud formation resource of `AWS::DynamoDB::Table`
   */
  DEFAULT = 'DEFAULT',
  /**
   * Use custom resource type `Custom::AmplifyDynamoDBTable`
   */
  AMPLIFY_TABLE = 'AMPLIFY_TABLE',
}

// TODO: add strategy for the RDS
export type DataSourceProvisionStrategy = DynamoDBProvisionStrategy;

export interface DataSourceType {
  dbType: DBType;
  provisionDB: boolean;
  provisionStrategy: DataSourceProvisionStrategy;
}

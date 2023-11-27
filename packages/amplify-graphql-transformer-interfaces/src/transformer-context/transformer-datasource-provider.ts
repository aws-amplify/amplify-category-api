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
 * Supported transformable database types. TODO: Remove this when we normalize database type handling throughout
 */
export type DBType = 'DDB' | SQLDBType;

/**
 * Supported transformable SQL database types. TODO: Remove this when we normalize database type handling throughout
 */
export type SQLDBType = 'MySQL' | 'Postgres';

// TODO: add strategy for the RDS. TODO: Move this to amplify-graphql-api-construct
export type DataSourceProvisionStrategy = DynamoDBProvisionStrategy | SQLLambdaModelProvisionStrategy;

/**
 * Provisioning configuration for a DynamoDB datasource. TODO: Remove this type in favor of strategy definitions in
 * amplify-graphql-api-construct
 */
export const enum DynamoDBProvisionStrategy {
  /**
   * Use default CloudFormation resource of `AWS::DynamoDB::Table`
   */
  DEFAULT = 'DEFAULT',
  /**
   * Use custom resource type `Custom::AmplifyDynamoDBTable`
   */
  AMPLIFY_TABLE = 'AMPLIFY_TABLE',
}

// TODO: Remove this type in favor of fully-specified SQLLambdaModelDataSourceStrategy from amplify-graphql-api-construct
export const enum SQLLambdaModelProvisionStrategy {
  /**
   * A strategy that creates a Lambda to connect to a pre-existing SQL table to resolve model data.
   */
  DEFAULT = 'DEFAULT',
}

// TODO: Replace usages of this type with ModelDataSourceStrategy
export interface DataSourceType {
  dbType: DBType;
  provisionDB: boolean;
  provisionStrategy: DataSourceProvisionStrategy;
}

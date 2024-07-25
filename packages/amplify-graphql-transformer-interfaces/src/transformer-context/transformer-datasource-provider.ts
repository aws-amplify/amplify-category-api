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

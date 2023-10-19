import { DBType } from './transformer-datasource-provider';

export type DatasourceProvisionStrategyBase = {
  dbType: DBType;
};
export type DynamoDBProvisionStrategy = DatasourceProvisionStrategyBase & {
  dbType: 'DDB';
  provisionStrategy: DynamoDBProvisionStrategyType;
};
export const enum DynamoDBProvisionStrategyType {
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
export type DatasourceProvisionStrategy = DynamoDBProvisionStrategy;

export type DatasourceProvisionConfig = {
  /**
   * Project level datasource provision strategy
   */
  project?: DatasourceProvisionStrategy;
  /**
   * Model level datasource provision strategy, keyed by @model type name
   */
  models?: Record<string, DatasourceProvisionStrategy>;
};

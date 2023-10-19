import { DBType } from '../config';

export type DatasourceProvisionStrategyBase = {
  dbType: DBType;
};
export type DynamoDBProvisionStrategy = DatasourceProvisionStrategyBase & {
  dbType: 'DDB';
  provisionStrategy: DynamoDBProvisionStrategyType;
};
export type RDSProvisionStrategy = DatasourceProvisionStrategyBase & {
  dbType: 'MYSQL';
  provisionStrategy: RDSProvisionStrategyType;
};
export const enum DynamoDBProvisionStrategyType {
  DEFAULT_CFN_TABLE = 'DEFAULT_CFN_TABLE',
  AMPLIFY_TABLE = 'AMPLIFY_TABLE',
}
export const enum RDSProvisionStrategyType {}
export type DatasourceProvisionStrategy = DynamoDBProvisionStrategy | RDSProvisionStrategy;

export type DatasourceProvisionConfig = {
  project?: DatasourceProvisionStrategy;
  models?: Record<string, DatasourceProvisionStrategy>;
};

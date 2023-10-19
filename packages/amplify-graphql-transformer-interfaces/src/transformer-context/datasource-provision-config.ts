import { DBType } from './transformer-datasource-provider';

export type DatasourceProvisionStrategyBase = {
  dbType: DBType;
};
export type DynamoDBProvisionStrategy = DatasourceProvisionStrategyBase & {
  dbType: 'DDB';
  provisionStrategy: DynamoDBProvisionStrategyType;
};
export type RDSProvisionStrategy = DatasourceProvisionStrategyBase & {
  dbType: 'MySQL';
  provisionStrategy: RDSProvisionStrategyType;
};
export const enum DynamoDBProvisionStrategyType {
  DEFAULT = 'DEFAULT',
  AMPLIFY_TABLE = 'AMPLIFY_TABLE',
}
export const enum RDSProvisionStrategyType {
  BROWN_FIELD = 'BROWN_FIELD',
}
export type DatasourceProvisionStrategy = DynamoDBProvisionStrategy | RDSProvisionStrategy;

export type DatasourceProvisionConfig = {
  project?: DatasourceProvisionStrategy;
  models?: Record<string, DatasourceProvisionStrategy>;
};

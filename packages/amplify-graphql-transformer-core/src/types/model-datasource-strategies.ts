import {
  ModelDataSourceStrategy,
  ModelDataSourceStrategyDbType,
  ModelDataSourceStrategySqlDbType,
} from '@aws-amplify/graphql-transformer-interfaces';

export const DDB_DB_TYPE: ModelDataSourceStrategyDbType = 'DYNAMODB';

export const MYSQL_DB_TYPE: ModelDataSourceStrategySqlDbType = 'MYSQL';

export const POSTGRES_DB_TYPE: ModelDataSourceStrategySqlDbType = 'POSTGRES';

export const DDB_DEFAULT_DATASOURCE_STRATEGY: ModelDataSourceStrategy = {
  dbType: DDB_DB_TYPE,
  provisionStrategy: 'DEFAULT',
};

export const DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY: ModelDataSourceStrategy = {
  dbType: DDB_DB_TYPE,
  provisionStrategy: 'AMPLIFY_TABLE',
};

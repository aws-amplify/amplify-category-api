import { MYSQL_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import {
  ModelDataSourceStrategySqlDbType,
  ProvisionedConcurrencyConfig,
  SQLLambdaModelDataSourceStrategy,
  SqlModelDataSourceDbConnectionConfig,
  VpcConfig,
} from '@aws-amplify/graphql-transformer-interfaces';

export interface MakeSqlDataSourceStrategyOptions {
  name?: string;
  dbType?: ModelDataSourceStrategySqlDbType;
  dbConnectionConfig?: SqlModelDataSourceDbConnectionConfig;
  vpcConfiguration?: VpcConfig;
  sqlLambdaProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfig;
}

/** A mock SqlModelDataSourceDbConnectionConfig where all values are filled with `/dbconfig/{parameter name}`, as in '/dbconfig/hostname' */
export const MOCK_DB_CONNECTION_CONFIG: SqlModelDataSourceDbConnectionConfig = {
  databaseNameSsmPath: '/dbconfig/databaseName',
  hostnameSsmPath: '/dbconfig/hostname',
  passwordSsmPath: '/dbconfig/password',
  portSsmPath: '/dbconfig/port',
  usernameSsmPath: '/dbconfig/username',
};

/**
 * Creates a mock SQLLambdaModelDataSourceStrategy with default values. Default values can be overridden by specifying the appropriate
 * option.
 *
 * Defaults:
 * - dbType: 'MYSQL'
 * - name: `${dbType}MockStrategy`
 * - dbConnectionConfig: MOCK_DB_CONNECTION_CONFIG
 * - vpcConfiguration: undefined
 * - sqlLambdaProvisionedConcurrencyConfig: undefined
 */
export const mockSqlDataSourceStrategy = (options?: MakeSqlDataSourceStrategyOptions): SQLLambdaModelDataSourceStrategy => {
  const dbType = options?.dbType ?? MYSQL_DB_TYPE;
  const name = options?.name ?? `${dbType}MockStrategy`;
  const dbConnectionConfig = options?.dbConnectionConfig ?? MOCK_DB_CONNECTION_CONFIG;
  const vpcConfiguration = options?.vpcConfiguration;
  const sqlLambdaProvisionedConcurrencyConfig = options?.sqlLambdaProvisionedConcurrencyConfig;

  return {
    name,
    dbType,
    dbConnectionConfig,
    vpcConfiguration,
    sqlLambdaProvisionedConcurrencyConfig,
  };
};

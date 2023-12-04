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
  // Note: this is only supported in the CDK Construct flavor of the SQLLambdaModelDataSourceStrategy
  customSqlStatements?: Record<string, string>;
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
 * Note that this returns the CDK flavor of the SQLLambdaModelDataSourceStrategy interface, by allowing the `customSqlStatements` field.
 * However, because that is the only difference between the two interfaces, this helper is suitable for mocking strategies in both CDK and
 * transformer tests.
 *
 * Defaults:
 * - dbType: 'MYSQL'
 * - name: `${dbType}MockStrategy`
 * - dbConnectionConfig: MOCK_DB_CONNECTION_CONFIG
 * - vpcConfiguration: undefined
 * - sqlLambdaProvisionedConcurrencyConfig: undefined
 * - customSqlStatements: undefined
 */
export const mockSqlDataSourceStrategy = (
  options?: MakeSqlDataSourceStrategyOptions,
): SQLLambdaModelDataSourceStrategy & {
  customSqlStatements?: Record<string, string>;
} => {
  const dbType = options?.dbType ?? MYSQL_DB_TYPE;
  const name = options?.name ?? `${dbType}MockStrategy`;
  const dbConnectionConfig = options?.dbConnectionConfig ?? MOCK_DB_CONNECTION_CONFIG;
  const vpcConfiguration = options?.vpcConfiguration;
  const sqlLambdaProvisionedConcurrencyConfig = options?.sqlLambdaProvisionedConcurrencyConfig;
  const customSqlStatements = options?.customSqlStatements;
  return {
    name,
    dbType,
    dbConnectionConfig,
    vpcConfiguration,
    sqlLambdaProvisionedConcurrencyConfig,
    customSqlStatements,
  };
};

import * as fs from 'fs';
import * as path from 'path';
import { isSqlDbType } from '@aws-amplify/graphql-transformer-core';
import {
  SQLLambdaModelDataSourceStrategy,
  SqlModelDataSourceDbConnectionConfig,
  SqlModelDataSourceSsmDbConnectionConfig,
  SqlModelDataSourceSecretsManagerDbConnectionConfig,
  SqlModelDataSourceSsmDbConnectionStringConfig,
} from './model-datasource-strategy-types';

/**
 * Type predicate that returns true if the object is a SQLLambdaModelDataSourceStrategy.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SQLLambdaModelDataSourceStrategy
 */
export const isSQLLambdaModelDataSourceStrategy = (obj: any): obj is SQLLambdaModelDataSourceStrategy => {
  return (
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.name === 'string' &&
    typeof obj.dbType === 'string' &&
    isSqlDbType(obj.dbType) &&
    isSqlModelDataSourceDbConnectionConfig(obj.dbConnectionConfig)
  );
};

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceDbConnectionConfig.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceDbConnectionConfig
 */
export const isSqlModelDataSourceDbConnectionConfig = (obj: any): obj is SqlModelDataSourceDbConnectionConfig => {
  return (
    isSqlModelDataSourceSsmDbConnectionConfig(obj) ||
    isSqlModelDataSourceSecretsManagerDbConnectionConfig(obj) ||
    isSqlModelDataSourceSsmDbConnectionStringConfig(obj)
  );
};

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceSsmDbConnectionConfig.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceSsmDbConnectionConfig
 */
export const isSqlModelDataSourceSsmDbConnectionConfig = (obj: any): obj is SqlModelDataSourceSsmDbConnectionConfig => {
  return (
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.hostnameSsmPath === 'string' &&
    typeof obj.portSsmPath === 'string' &&
    typeof obj.usernameSsmPath === 'string' &&
    typeof obj.passwordSsmPath === 'string' &&
    typeof obj.databaseNameSsmPath === 'string'
  );
};

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceSecretsManagerDbConnectionConfig.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceSecretsManagerDbConnectionConfig
 */
export const isSqlModelDataSourceSecretsManagerDbConnectionConfig = (
  obj: any,
): obj is SqlModelDataSourceSecretsManagerDbConnectionConfig => {
  return (
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.secretArn === 'string' &&
    typeof obj.port === 'number' &&
    typeof obj.databaseName === 'string' &&
    typeof obj.hostname == 'string'
  );
};

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceSsmDbConnectionStringConfig.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceSsmDbConnectionStringConfig
 */
export const isSqlModelDataSourceSsmDbConnectionStringConfig = (obj: any): obj is SqlModelDataSourceSsmDbConnectionStringConfig => {
  return (
    (typeof obj === 'object' || typeof obj === 'function') &&
    (typeof obj.connectionUriSsmPath === 'string' || Array.isArray(obj.connectionUriSsmPath))
  );
};

/**
 * Class exposing utilities to produce SQLLambdaModelDataSourceStrategy objects given various inputs.
 */
export class SQLLambdaModelDataSourceStrategyFactory {
  /**
   * Creates a SQLLambdaModelDataSourceStrategy where the binding's `customSqlStatements` are populated from `sqlFiles`. The key
   * of the `customSqlStatements` record is the file's base name (that is, the name of the file minus the directory and extension).
   * @param sqlFiles the list of files to load SQL statements from.
   * @param options the remaining SQLLambdaModelDataSourceStrategy options.
   */
  static fromCustomSqlFiles(
    sqlFiles: string[],
    options: Exclude<SQLLambdaModelDataSourceStrategy, 'customSqlStatements'>,
  ): SQLLambdaModelDataSourceStrategy {
    const customSqlStatements = sqlFiles.reduce((acc, filePath): Record<string, string> => {
      const basename = path.parse(filePath).name;
      acc[basename] = fs.readFileSync(filePath, 'utf8');
      return acc;
    }, {} as Record<string, string>);

    return {
      customSqlStatements,
      ...options,
    };
  }
}

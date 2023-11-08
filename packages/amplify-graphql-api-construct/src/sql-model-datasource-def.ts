import * as fs from 'fs';
import * as path from 'path';
import { SQLLambdaModelDataSourceDefinitionStrategy, SqlModelDataSourceDefinitionDbConnectionConfig } from './types';

/**
 * Type predicate that returns true if the object is a SQLLambdaModelDataSourceDefinitionStrategy.
 * @param obj the object to inspect
 * @returns true if the object is a ModelDataSourceDefinition with a SQLLambdaModelDataSourceDefinitionStrategy
 */
export const isSQLLambdaModelDataSourceDefinition = (
  obj: any,
): obj is {
  name: string;
  strategy: SQLLambdaModelDataSourceDefinitionStrategy;
} => {
  console.log(`obj: ${JSON.stringify(obj)}`);
  return (
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.name === 'string' &&
    isSQLLambdaModelDataSourceDefinitionStrategy(obj.strategy)
  );
};

/**
 * Type predicate that returns true if the object is a SQLLambdaModelDataSourceDefinitionStrategy.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SQLLambdaModelDataSourceDefinitionStrategy
 */
export const isSQLLambdaModelDataSourceDefinitionStrategy = (obj: any): obj is SQLLambdaModelDataSourceDefinitionStrategy => {
  console.log(`obj: ${JSON.stringify(obj)}`);
  return (
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.dbType === 'string' &&
    // TODO: Use canonical SQL DB type strings
    ['MYSQL', 'POSTGRES'].includes(obj.dbType) &&
    isSqlModelDataSourceDefinitionDbConnectionConfig(obj.dbConnectionConfig)
  );
};

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceDefinitionDbConnectionConfig.
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceDefinitionDbConnectionConfig
 */
export const isSqlModelDataSourceDefinitionDbConnectionConfig = (obj: any): obj is SqlModelDataSourceDefinitionDbConnectionConfig => {
  console.log(`obj: ${JSON.stringify(obj)}`);
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
 * Class exposing utilities to produce SQLLambdaModelDataSourceDefinitionStrategy objects given various inputs.
 */
export class SQLLambdaModelDataSourceDefinitionStrategyFactory {
  /**
   * Creates a SQLLambdaModelDataSourceDefinitionStrategy where the binding's `customSqlStatements` are populated from `sqlFiles`. The key
   * of the `customSqlStatements` record is the file's base name (that is, the name of the file minus the directory and extension).
   * @param sqlFiles the list of files to load SQL statements from.
   * @param options the remaining SQLLambdaModelDataSourceDefinitionStrategy options.
   */
  static fromCustomSqlFiles(
    sqlFiles: string[],
    options: Exclude<SQLLambdaModelDataSourceDefinitionStrategy, 'customSqlStatements'>,
  ): SQLLambdaModelDataSourceDefinitionStrategy {
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

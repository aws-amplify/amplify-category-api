import * as fs from 'fs';
import * as path from 'path';
import { SqlModelDataSourceBinding } from './types';

/**
 * Type predicate that returns true if the object is a SqlModelDataSourceBinding. TODO: Update bindingType check when we add support for
 * PostgreSQL
 * @param obj the object to inspect
 * @returns true if the object is shaped like a SqlModelDataSourceBinding
 */
export const isSqlModelDataSourceBinding = (obj: any): obj is SqlModelDataSourceBinding => {
  return (typeof obj === 'object' || typeof obj === 'function') && typeof obj.bindingType === 'string' && obj.bindingType === 'MySQL';
};

/**
 * Class exposing utilities to produce ISqlModelDataSourceBinding objects given various inputs.
 */
export class SqlModelDataSourceBindingFactory {
  /**
   * Creates an ISqlModelDataSourceBinding where the binding's `customSqlStatements` are populated from `sqlFiles`. The key of the
   * `customSqlStatements` record is the file's base name (that is, the name of the file minus the directory and extension).
   * @param sqlFiles the list of files to load SQL statements from.
   * @param options the remaining ISqlModelDataSourceBinding options.
   */
  static fromCustomSqlFiles(
    sqlFiles: string[],
    options: Exclude<SqlModelDataSourceBinding, 'customSqlStatements'>,
  ): SqlModelDataSourceBinding {
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

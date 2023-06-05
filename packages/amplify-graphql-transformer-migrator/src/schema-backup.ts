import * as path from 'path';
import * as fs from 'fs-extra';

/**
 *
 * @param resourceDir
 */
export const backupLocation = (resourceDir: string) => path.join(resourceDir, '.migration-backup');

/**
 *
 * @param resourceDir
 */
export const backupSchemas = async (resourceDir: string): Promise<void> => {
  const schemaFilePath = path.join(resourceDir, 'schema.graphql');
  const schemaDirPath = path.join(resourceDir, 'schema');
  const schemaFileExists = fs.existsSync(schemaFilePath);
  const schemaDirectoryExists = fs.existsSync(schemaDirPath);
  if (schemaFileExists) {
    await fs.copy(schemaFilePath, path.join(backupLocation(resourceDir), 'schema.graphql'), { overwrite: false, errorOnExist: true });
    return;
  }
  if (schemaDirectoryExists) {
    await fs.copy(schemaDirPath, path.join(backupLocation(resourceDir), 'schema'), { overwrite: false, errorOnExist: true });
  }
};

/**
 *
 * @param resourceDir
 */
export const restoreSchemas = async (resourceDir: string): Promise<void> => {
  await fs.copy(backupLocation(resourceDir), resourceDir);
  await fs.remove(backupLocation(resourceDir));
};

/**
 *
 * @param resourceDir
 */
export function doesBackupExist(resourceDir: string): boolean {
  return fs.existsSync(backupLocation(resourceDir));
}

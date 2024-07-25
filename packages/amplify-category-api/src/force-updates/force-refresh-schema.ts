import fs from 'fs-extra';
import path from 'path';
import { getApiResourceDir } from './api-resource-paths';

/**
 * Add a whitespace character to the graphql schema, forcing a rebuild of resolver/schema/cfn resources, and a push.
 * This is useful if resolver implementations have changed, and the customer does not wish to update their schema,
 * or amplify is updating on their behalf under the hood.
 */
export const forceRefreshSchema = (): void => {
  const apiResourceDir = getApiResourceDir();
  const schemaFilePath = path.join(apiResourceDir, 'schema.graphql');
  const schemaDirectoryPath = path.join(apiResourceDir, 'schema');
  const schemaFileExists = fs.existsSync(schemaFilePath);
  const schemaDirectoryExists = fs.existsSync(schemaDirectoryPath);

  if (schemaFileExists) {
    fs.appendFileSync(schemaFilePath, ' ');
  } else if (schemaDirectoryExists) {
    modifyGraphQLSchemaDirectory(schemaDirectoryPath);
  }
};

/**
 * Given a schema path, attach whitespace to each non-hidden file recursively.
 * @param schemaDirectoryPath the path to search
 * @returns a false at the top level, when complete.
 */
const modifyGraphQLSchemaDirectory = (schemaDirectoryPath: string): boolean => {
  const files = fs.readdirSync(schemaDirectoryPath);

  for (const fileName of files) {
    const isHiddenFile = fileName.indexOf('.') === 0;

    if (isHiddenFile) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const fullPath = path.join(schemaDirectoryPath, fileName);
    const stats = fs.lstatSync(fullPath);

    if (stats.isDirectory() && modifyGraphQLSchemaDirectory(fullPath)) {
      return true;
    }

    if (stats.isFile()) {
      fs.appendFileSync(fullPath, ' ');
      return true;
    }
  }

  return false;
};

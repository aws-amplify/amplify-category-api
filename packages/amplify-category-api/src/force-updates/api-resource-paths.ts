import { pathManager, stateManager } from '@aws-amplify/amplify-cli-core';
import fs from 'fs-extra';

/**
 * Checks the project root meta for a resource related to AppSync, and if the expected path exists, returns true, else false.
 * @returns a boolean indicating if there is a graphql api on the project.
 */
const containsGraphQLApi = (): boolean => {
  const projectPath = pathManager.findProjectRoot() ?? process.cwd();
  const meta = stateManager.getMeta(projectPath);

  const apiNames = Object.entries(meta?.api || {})
    .filter(([_, apiResource]) => (apiResource as any).service === 'AppSync')
    .map(([name]) => name);

  const doesNotHaveGqlApi = apiNames.length < 1;

  if (doesNotHaveGqlApi) {
    return false;
  }

  const apiName = apiNames[0];
  const apiResourceDir = pathManager.getResourceDirectoryPath(projectPath, 'api', apiName);

  if (!fs.existsSync(apiResourceDir)) {
    return false;
  }

  return true;
};

/**
 * Search for the single GraphQL Api in the project, and return the path.
 * @returns the path to the resource directory for a graphql api, of undefined if not found.
 */
export const getApiResourceDir = (): string | undefined => {
  const hasGraphQLApi = containsGraphQLApi();
  if (!hasGraphQLApi) {
    return undefined;
  }

  const projectPath = pathManager.findProjectRoot() ?? process.cwd();
  const meta = stateManager.getMeta(projectPath);

  const apiNames = Object.entries(meta?.api || {})
    .filter(([_, apiResource]) => (apiResource as any).service === 'AppSync')
    .map(([name]) => name);

  const apiName = apiNames[0];
  const apiResourceDir = pathManager.getResourceDirectoryPath(projectPath, 'api', apiName);

  return apiResourceDir;
};

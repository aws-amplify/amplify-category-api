import { AmplifyCategories, stateManager } from 'amplify-cli-core';
import _ from 'lodash';
import path from 'path';

const getParameterNameForDBSecret = (secret: string, database: string): string => {
  return `${database}_${secret}`;
};

/* This adheres to the following convention:
  /amplify/<appId>/<envName>/AMPLIFY_${categoryName}${resourceName}${paramName}
  where paramName is databaseName_<secretName>
*/
export const getParameterStoreSecretPath = (secret: string, database:string, apiName: string, envName?: string): string => {
  const appId = stateManager.getAppID();
  if(_.isEmpty(appId)) {
    throw new Error('Unable to read the App ID');
  }
  const environmentName = envName || stateManager.getCurrentEnvName();
  const categoryName = AmplifyCategories.API;
  const paramName = getParameterNameForDBSecret(secret, database);

  if (!environmentName) {
    throw new Error('Unable to create RDS secret path, environment not found/defined');
  }
  return path.posix.join('/amplify', appId, environmentName, `AMPLIFY_${categoryName}${apiName}${paramName}`);
};

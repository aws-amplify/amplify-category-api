import { AmplifyCategories, stateManager } from '@aws-amplify/amplify-cli-core';
import _ from 'lodash';
import path from 'path';

const getParameterNameForDBSecret = (secret: string, secretsKey: string): string => {
  return `${secretsKey}_${secret}`;
};

/* This adheres to the following convention:
  /amplify/<appId>/<envName>/AMPLIFY_${categoryName}${resourceName}${paramName}
  where paramName is secretsKey_<secretName>
*/
export const getParameterStoreSecretPath = (secret: string, secretsKey:string, apiName: string, envName?: string): string => {
  const appId = stateManager.getAppID();
  if(_.isEmpty(appId)) {
    throw new Error('Unable to read the App ID');
  }
  const environmentName = envName || stateManager.getCurrentEnvName();
  const categoryName = AmplifyCategories.API;
  const paramName = getParameterNameForDBSecret(secret, secretsKey);

  if (!environmentName) {
    throw new Error('Unable to create RDS secret path, environment not found/defined');
  }
  return path.posix.join('/amplify', appId, environmentName, `AMPLIFY_${categoryName}${apiName}${paramName}`);
};

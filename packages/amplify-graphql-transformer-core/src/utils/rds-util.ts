import path from 'path';
import _ from 'lodash';
import { APICategory } from './api-category';

const getParameterNameForDBSecret = (secret: string, secretsKey: string): string => {
  return `${secretsKey}_${secret}`;
};

/**
 * This adheres to the following convention:
 *  `/amplify/{appId}/{environmentName}/AMPLIFY_{categoryName}.{sqlDataSourceName}.{resourceName}.{secretsKey}_{secretName}`
 */
export const getParameterStoreSecretPath = (
  secretName: string,
  secretsKey: string,
  apiName: string,
  environmentName: string,
  appId: string,
  sqlDataSourceName: string,
): string => {
  if (_.isEmpty(appId)) {
    throw new Error('Unable to read the App ID');
  }

  if (!environmentName) {
    throw new Error('Unable to create RDS secret path, environment not found/defined');
  }

  const categoryName = APICategory;
  const paramName = getParameterNameForDBSecret(secretName, secretsKey);

  const parameterPathComponent = [`AMPLIFY_${categoryName}`, categoryName, sqlDataSourceName, apiName, paramName].join('.');

  // It's unlikely we'll ever hit this limit, but for awareness, the maximum length of this key is 1011 characters.
  // https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_PutParameter.html#systemsmanager-PutParameter-request-Name
  return path.posix.join('/amplify', appId, environmentName, parameterPathComponent);
};

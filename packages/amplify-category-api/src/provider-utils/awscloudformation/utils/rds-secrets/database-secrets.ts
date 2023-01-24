import { stateManager, $TSContext, AmplifyCategories } from 'amplify-cli-core';
import { __promisify__ } from 'glob';
import _ from 'lodash';
import * as path from 'path';
import { SSMClient } from './ssmClient';

const secretNames = ['username', 'password'];

export type RDSConnectionSecrets = {
  username: string,
  password: string
};

export const getExistingConnectionSecrets = async (context: $TSContext, database: string, apiName: string, envName?: string): Promise<RDSConnectionSecrets|undefined> => {
  try {
    const ssmClient = await SSMClient.getInstance(context);
    const secrets = await ssmClient.getSecrets(
      secretNames.map( secret => getParameterStoreSecretPath(secret, database, apiName, envName))
    );

    if(_.isEmpty(secrets)) {
      return;
    }
  
    const existingSecrets = secretNames.map( secretName => {
      const secretPath = getParameterStoreSecretPath(secretName, database, apiName, envName);
      const matchingSecret = secrets?.find( secret => (secret?.secretName === secretPath) && !_.isEmpty(secret?.secretValue) );
      const result = {};
      if(matchingSecret) {
        result[secretName] = matchingSecret.secretValue;
      }
      return result;
    }).reduce((result, current) => {
      if(!_.isEmpty(current)) {
        return Object.assign(result, current);
      }
    }, {});

    if(existingSecrets && (Object.keys(existingSecrets)?.length === secretNames?.length)) {
      return existingSecrets;
    }
  }
  catch (error) {
    return;
  }
};

export const storeConnectionSecrets = async (context: $TSContext, database: string, secrets: RDSConnectionSecrets, apiName: string) => {
  const ssmClient = await SSMClient.getInstance(context);
  secretNames.map( async (secret) => {
    const parameterPath = getParameterStoreSecretPath(secret, database, apiName);
    await ssmClient.setSecret(parameterPath, secrets[secret]);
  });
};

/* This adheres to the following convention:
  /amplify/<appId>/<envName>/AMPLIFY_${categoryName}${resourceName}${paramName}
  where paramName is databaseName_<secretName>
*/
export const getParameterStoreSecretPath = (secret: string, database:string, apiName: string, envName?: string): string => {
  const appId = stateManager.getAppID();
  const environmentName = envName || stateManager.getCurrentEnvName();
  const categoryName = AmplifyCategories.API;
  const paramName = getParameterNameForDBSecret(secret, database);
  return path.posix.join('/amplify', appId, environmentName, `AMPLIFY_${categoryName}${apiName}${paramName}`);
};

const getParameterNameForDBSecret = (secret: string, database: string): string => {
  return `${database}_${secret}`;
};

export const deleteConnectionSecrets = async (context: $TSContext, database: string, apiName: string, envName?: string) => {
  const ssmClient = await SSMClient.getInstance(context);
  const secretParameterPaths = secretNames.map( secret => {
    return getParameterStoreSecretPath(secret, database, apiName, envName);
  });
  await ssmClient.deleteSecrets(secretParameterPaths);
};

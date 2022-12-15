import { stateManager, $TSContext } from 'amplify-cli-core';
import { __promisify__ } from 'glob';
import _ from 'lodash';
import * as path from 'path';
import { SSMClient } from './ssmClient';

const secretNames = ['username', 'password'];

export type RDSConnectionSecrets = {
  username: string,
  password: string
};

export const getExistingConnectionSecrets = async (context: $TSContext, database: string): Promise<RDSConnectionSecrets|undefined> => {
  try {
    const ssmClient = await SSMClient.getInstance(context);
    const secrets = await ssmClient.getSecrets(
      secretNames.map( secret => getParameterStoreSecretPath(secret, database))
    );

    if(_.isEmpty(secrets)) {
      return;
    }
  
    const existingSecrets = secretNames.map( secretName => {
      const secretPath = getParameterStoreSecretPath(secretName, database);
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

export const storeConnectionSecrets = async (context: $TSContext, database: string, secrets: RDSConnectionSecrets) => {
  const ssmClient = await SSMClient.getInstance(context);
  secretNames.map( async (secret) => {
    const parameterPath = getParameterStoreSecretPath(secret, database);
    await ssmClient.setSecret(parameterPath, secrets[secret]);
  });
};

export const getParameterStoreSecretPath = (secret: string, database:string): string => {
  const appId = stateManager.getAppID();
  const envName = stateManager.getCurrentEnvName();
  return path.posix.join('/amplify', appId, envName, database, `AMPLIFY_${secret}`);
};

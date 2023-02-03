import { $TSContext } from 'amplify-cli-core';
import _ from 'lodash';
import { getParameterStoreSecretPath, RDSConnectionSecrets } from '@aws-amplify/graphql-transformer-core';
import { SSMClient } from './ssmClient';
import { RDSDBConfig } from '@aws-amplify/graphql-transformer-core';

const secretNames = ['username', 'password'];

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

export const getExistingConnectionSecretNames = async (context: $TSContext, config: Partial<RDSDBConfig>, apiName: string, envName?: string): Promise<RDSConnectionSecrets|undefined> => {
  try {
    const ssmClient = await SSMClient.getInstance(context);
    const secrets = await ssmClient.getSecrets(
      secretNames.map( secret => getParameterStoreSecretPath(secret, config.database, apiName, envName))
    );

    if(_.isEmpty(secrets)) {
      return;
    }

    const existingSecrets = secretNames.map((secretName) => {
      const secretPath = getParameterStoreSecretPath(secretName, config.database, apiName, envName);
      const matchingSecret = secrets?.find((secret) => (secret?.secretName === secretPath) && !_.isEmpty(secret?.secretValue));
      const result = {};
      if (matchingSecret) {
        result[secretName] = secretPath;
      }
      return result;
    }).reduce((result, current) => {
      if (!_.isEmpty(current)) {
        return Object.assign(result, current);
      }
    }, {});

    if (existingSecrets && (Object.keys(existingSecrets)?.length === secretNames?.length)) {
      existingSecrets.database = config.database;
      existingSecrets.host = config.host;
      existingSecrets.port = config.port;
      return existingSecrets;
    }
  } catch (error) {
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

export const deleteConnectionSecrets = async (context: $TSContext, database: string, apiName: string, envName?: string) => {
  const ssmClient = await SSMClient.getInstance(context);
  const secretParameterPaths = secretNames.map( secret => {
    return getParameterStoreSecretPath(secret, database, apiName, envName);
  });
  await ssmClient.deleteSecrets(secretParameterPaths);
};

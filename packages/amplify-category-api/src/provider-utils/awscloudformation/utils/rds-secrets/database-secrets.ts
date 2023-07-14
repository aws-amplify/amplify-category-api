import { $TSContext, stateManager } from '@aws-amplify/amplify-cli-core';
import _ from 'lodash';
import { getParameterStoreSecretPath, RDSConnectionSecrets } from '@aws-amplify/graphql-transformer-core';
import { SSMClient } from './ssmClient';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { MySQLDataSourceAdapter, Schema, Engine, DataSourceAdapter, MySQLDataSourceConfig } from '@aws-amplify/graphql-schema-generator';
import { printer } from '@aws-amplify/amplify-prompts';

const secretNames = ['database', 'host', 'port', 'username', 'password'];

export const getExistingConnectionSecrets = async (
  context: $TSContext,
  secretsKey: string,
  apiName: string,
  envName?: string,
): Promise<RDSConnectionSecrets | undefined> => {
  try {
    const environmentName = envName || stateManager.getCurrentEnvName();
    const appId = stateManager.getAppID();

    const ssmClient = await SSMClient.getInstance(context);
    const secrets = await ssmClient.getSecrets(
      secretNames.map((secret) => getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId)),
    );

    if (_.isEmpty(secrets)) {
      return;
    }

    const existingSecrets = secretNames
      .map((secretName) => {
        const secretPath = getParameterStoreSecretPath(secretName, secretsKey, apiName, environmentName, appId);
        const matchingSecret = secrets?.find((secret) => secret?.secretName === secretPath && !_.isEmpty(secret?.secretValue));
        const result = {};
        if (matchingSecret) {
          result[secretName] = matchingSecret.secretValue;
        }
        return result;
      })
      .reduce((result, current) => {
        if (!_.isEmpty(current)) {
          return Object.assign(result, current);
        }
      }, {});

    if (existingSecrets && Object.keys(existingSecrets)?.length === secretNames?.length) {
      return existingSecrets;
    }
  } catch (error) {
    return;
  }
};

export const getExistingConnectionSecretNames = async (
  context: $TSContext,
  apiName: string,
  secretsKey: string,
  envName?: string,
): Promise<RDSConnectionSecrets | undefined> => {
  try {
    const environmentName = envName || stateManager.getCurrentEnvName();
    const appId = stateManager.getAppID();
    const ssmClient = await SSMClient.getInstance(context);
    const secrets = await ssmClient.getSecrets(
      secretNames.map((secret) => getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId)),
    );

    if (_.isEmpty(secrets)) {
      return;
    }

    const existingSecrets = secretNames
      .map((secretName) => {
        const secretPath = getParameterStoreSecretPath(secretName, secretsKey, apiName, environmentName, appId);
        const matchingSecret = secrets?.find((secret) => secret?.secretName === secretPath && !_.isEmpty(secret?.secretValue));
        const result = {};
        if (matchingSecret) {
          result[secretName] = secretPath;
        }
        return result;
      })
      .reduce((result, current) => {
        if (!_.isEmpty(current)) {
          return Object.assign(result, current);
        }
      }, {});

    if (existingSecrets && Object.keys(existingSecrets)?.length === secretNames?.length) {
      return existingSecrets;
    }
  } catch (error) {
    return;
  }
};

export const storeConnectionSecrets = async (context: $TSContext, secrets: RDSConnectionSecrets, apiName: string, secretsKey: string) => {
  const environmentName = stateManager.getCurrentEnvName();
  const appId = stateManager.getAppID();

  const ssmClient = await SSMClient.getInstance(context);
  secretNames.map(async (secret) => {
    const parameterPath = getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId);
    await ssmClient.setSecret(parameterPath, secrets[secret]?.toString());
  });
};

export const deleteConnectionSecrets = async (context: $TSContext, secretsKey: string, apiName: string, envName?: string) => {
  let appId;
  const environmentName = stateManager.getCurrentEnvName();
  try {
    appId = stateManager.getAppID();
  } catch (error) {
    printer.debug(`No AppId found when deleting parameters for environment ${envName}`);
    return;
  }
  const ssmClient = await SSMClient.getInstance(context);
  const secretParameterPaths = secretNames.map((secret) => {
    return getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId);
  });
  await ssmClient.deleteSecrets(secretParameterPaths);
};

export const testDatabaseConnection = async (config: RDSConnectionSecrets) => {
  // Establish the connection
  let adapter: DataSourceAdapter;
  let schema: Schema;
  switch (config.engine) {
    case ImportedRDSType.MYSQL:
      adapter = new MySQLDataSourceAdapter(config as MySQLDataSourceConfig);
      schema = new Schema(new Engine('MySQL'));
      break;
    default:
      printer.error('Only MySQL Data Source is supported.');
  }

  try {
    await adapter.initialize();
  } catch (error) {
    printer.error('Failed to connect to the specified RDS Data Source. Check the connection details and retry.');
    adapter.cleanup();
    throw error;
  }
  adapter.cleanup();
};

export const getSecretsKey = async (): Promise<string> => {
  // this will be an extension point when we support multiple database imports.
  return 'schema';
};

export const getDatabaseName = async (context: $TSContext, apiName: string, secretsKey: string): Promise<string | undefined> => {
  const environmentName = stateManager.getCurrentEnvName();
  const appId = stateManager.getAppID();
  const ssmClient = await SSMClient.getInstance(context);

  const secrets = await ssmClient.getSecrets([getParameterStoreSecretPath('database', secretsKey, apiName, environmentName, appId)]);

  if (_.isEmpty(secrets)) {
    return;
  }

  return secrets[0].secretValue;
};

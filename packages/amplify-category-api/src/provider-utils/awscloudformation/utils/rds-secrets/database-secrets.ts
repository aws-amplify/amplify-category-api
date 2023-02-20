import { $TSContext, stateManager } from 'amplify-cli-core';
import _ from 'lodash';
import { getParameterStoreSecretPath, RDSConnectionSecrets } from '@aws-amplify/graphql-transformer-core';
import { SSMClient } from './ssmClient';
import { RDSDBConfig, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { MySQLDataSourceAdapter, Schema, Engine, DataSourceAdapter, MySQLDataSourceConfig } from '@aws-amplify/graphql-schema-generator';
import { printer } from 'amplify-prompts';
import { category } from '../../../../category-constants';

const secretNames = ['host', 'port', 'username', 'password'];

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

export const getExistingConnectionSecretNames = async (context: $TSContext, apiName: string, database: string, envName?: string): Promise<RDSConnectionSecrets|undefined> => {
  try {
    const ssmClient = await SSMClient.getInstance(context);
    const secrets = await ssmClient.getSecrets(
      secretNames.map( secret => getParameterStoreSecretPath(secret, database, apiName, envName))
    );

    if(_.isEmpty(secrets)) {
      return;
    }

    const existingSecrets = secretNames.map((secretName) => {
      const secretPath = getParameterStoreSecretPath(secretName, database, apiName, envName);
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
      existingSecrets.database = database;
      return existingSecrets;
    }
  } catch (error) {
    return;
  }
};

export const storeConnectionSecrets = async (context: $TSContext, secrets: RDSConnectionSecrets, apiName: string) => {
  const ssmClient = await SSMClient.getInstance(context);
  secretNames.map( async (secret) => {
    const parameterPath = getParameterStoreSecretPath(secret, secrets.database, apiName);
    await ssmClient.setSecret(parameterPath, secrets[secret]?.toString());
  });
};

export const deleteConnectionSecrets = async (context: $TSContext, database: string, apiName: string, envName?: string) => {
  const ssmClient = await SSMClient.getInstance(context);
  const secretParameterPaths = secretNames.map( secret => {
    return getParameterStoreSecretPath(secret, database, apiName, envName);
  });
  await ssmClient.deleteSecrets(secretParameterPaths);
};

export const testDatabaseConnection = async (config: RDSConnectionSecrets) => {
  // Establish the connection
  let adapter: DataSourceAdapter;
  let schema: Schema;
  switch(config.engine) {
    case ImportedRDSType.MYSQL:
      adapter = new MySQLDataSourceAdapter(config as MySQLDataSourceConfig);
      schema = new Schema(new Engine('MySQL'));
      break;
    default:
      printer.error('Only MySQL Data Source is supported.');
  }

  try {
    await adapter.initialize();
  } catch(error) {
    printer.error('Failed to connect to the specified RDS Data Source. Check the connection details in the schema and re-try. Use "amplify api update-secrets" to update the user credentials.');
    console.log(error?.message);
    adapter.cleanup();
    throw(error);
  }
  adapter.cleanup();
};

export const readDatabaseNameFromMeta = async (apiName: string, engine: ImportedRDSType): Promise<string|undefined> => {
  const meta = stateManager.getMeta();
  return(_.get(meta, [category, apiName,'dataSourceConfig', engine]));
};

import { $TSContext, stateManager } from '@aws-amplify/amplify-cli-core';
import _ from 'lodash';
import {
  getParameterStoreSecretPath,
  RDSConnectionSecrets,
  ImportedRDSType,
  ImportedDataSourceConfig,
} from '@aws-amplify/graphql-transformer-core';
import { MySQLDataSourceAdapter, DataSourceAdapter, MySQLDataSourceConfig } from '@aws-amplify/graphql-schema-generator';
import { printer } from '@aws-amplify/amplify-prompts';
import { DeleteFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { DeleteRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import { SqlModelDataSourceSsmDbConnectionConfig } from '@aws-amplify/graphql-transformer-interfaces';
import { getAppSyncAPIName } from '../amplify-meta-utils';
import { databaseConfigurationInputWalkthrough } from '../../service-walkthroughs/appSync-rds-db-config';
import { SSMClient } from './ssmClient';

const secretNames = ['database', 'host', 'port', 'username', 'password'];
const secretNamesToDbConnectionConfigFields: Record<string, keyof SqlModelDataSourceSsmDbConnectionConfig> = {
  database: 'databaseNameSsmPath',
  host: 'hostnameSsmPath',
  port: 'portSsmPath',
  username: 'usernameSsmPath',
  password: 'passwordSsmPath',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isConnectionSecrets = (obj: any): obj is RDSConnectionSecrets => {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  return secretNames.every((secretName) => secretName in obj);
};

/**
 * Derive name of schema inspector lambda
 * @param appId the Amplify App ID
 * @param envName the Amplify environment name
 * @returns the name of the schema inspector lambda
 */
export const getVpcMetadataLambdaName = (appId: string, envName: string): string => {
  if (appId && envName) {
    return `${appId}-rds-schema-inspector-${envName}`;
  }
  throw new Error('AppId and environment name are required to generate the schema inspector lambda.');
};

/**
 * Get database connection information from SSM
 * @param context the Amplify CLI context
 * @param secretsKey the "key" part of the SSM path of the parameter to retrieve
 * @param apiName the AppSync API name
 * @param envName the Amplify environment name
 * @returns a promise that resolves to the database connection information, or undefined if no connection information is stored
 */
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
      return undefined;
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
        } else {
          return current;
        }
      }, {});

    if (isConnectionSecrets(existingSecrets)) {
      return existingSecrets;
    } else {
      return undefined;
    }
  } catch (error) {
    return undefined;
  }
};

/**
 * Derives expected path names for database connection config parameters stored during the Gen1 CLI import flow.
 */
export const getExistingConnectionDbConnectionConfig = (apiName: string, secretsKey: string): SqlModelDataSourceSsmDbConnectionConfig => {
  const environmentName = stateManager.getCurrentEnvName();
  const appId = stateManager.getAppID();
  const dbConnectionConfig: any = {};
  secretNames.forEach((name) => {
    const path = getParameterStoreSecretPath(name, secretsKey, apiName, environmentName, appId);
    dbConnectionConfig[secretNamesToDbConnectionConfigFields[name]] = path;
  });
  return dbConnectionConfig;
};

/**
 * Get SSM paths for database connection information
 * @param context the Amplify CLI context
 * @param apiName the AppSync API name
 * @param secretsKey the "key" part of the SSM path of the parameter to retrieve
 * @param envName the Amplify environment name
 * @returns a promise that resolves to the database connection information, or undefined if no connection information is stored
 */
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
      return undefined;
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
        } else {
          return current;
        }
      }, {});

    if (isConnectionSecrets(existingSecrets)) {
      return existingSecrets;
    } else {
      return undefined;
    }
  } catch (error) {
    return undefined;
  }
};

/**
 * Store database connection information into SSM
 * @param context the Amplify CLI context
 * @param secrets the connection information to store
 * @param apiName the AppSync API name
 * @param secretsKey the prefix of the SSM path of the parameter to store
 */
export const storeConnectionSecrets = async (
  context: $TSContext,
  secrets: RDSConnectionSecrets,
  apiName: string,
  secretsKey: string,
): Promise<void> => {
  const environmentName = stateManager.getCurrentEnvName();
  const appId = stateManager.getAppID();

  const ssmClient = await SSMClient.getInstance(context);
  secretNames.map(async (secret) => {
    const parameterPath = getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId);
    await ssmClient.setSecret(parameterPath, secrets[secret]?.toString());
  });
};

/**
 * Delete database connection information from SSM
 * @param context the Amplify CLI context
 * @param secretsKey the prefix of the SSM path of the parameter to store
 * @param apiName the AppSync API name
 * @param envName the Amplify environment name
 */
export const deleteConnectionSecrets = async (
  context: $TSContext,
  secretsKey: string,
  apiName: string,
  envName?: string,
): Promise<void> => {
  const environmentName = stateManager.getCurrentEnvName();
  const meta = stateManager.getMeta();
  const { AmplifyAppId } = meta.providers.awscloudformation;
  if (!AmplifyAppId) {
    printer.debug(`No AppId found when deleting parameters for environment ${envName}`);
    return;
  }
  const ssmClient = await SSMClient.getInstance(context);
  const secretParameterPaths = secretNames.map((secret) => {
    return getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, AmplifyAppId);
  });
  await ssmClient.deleteSecrets(secretParameterPaths);
};

// TODO: This is not used. Leaving it here for now. Generate schema step already checks for connection.
/**
 * Try to establish a connection using the provided connection information
 * @param config the database connection information
 */
export const testDatabaseConnection = async (config: RDSConnectionSecrets): Promise<boolean> => {
  // Establish the connection
  let adapter: DataSourceAdapter;
  let canConnect = false;

  switch (config.engine) {
    case ImportedRDSType.MYSQL:
      adapter = new MySQLDataSourceAdapter(config as MySQLDataSourceConfig);
      break;
    default:
      printer.error('Only MySQL Data Source is supported.');
  }

  try {
    canConnect = await adapter.test();
  } finally {
    adapter.cleanup();
  }

  return canConnect;
};

// this will be an extension point when we support multiple database imports.
/**
 * Returns the prefix for the database configuration SSM paths
 * @returns the prefix for the database configuration SSM paths
 */
export const getSecretsKey = (): string => 'schema';

/**
 * Retrieves the database name from SSM
 * @param context the Amplify CLI context
 * @param apiName the AppSync API name
 * @param secretsKey the prefix of the SSM path of the parameter to store
 * @returns a Promise that resolves to the database name, or undefined if the name isn't at the expected SSM path
 */
export const getDatabaseName = async (context: $TSContext, apiName: string, secretsKey: string): Promise<string | undefined> => {
  const environmentName = stateManager.getCurrentEnvName();
  const appId = stateManager.getAppID();
  const ssmClient = await SSMClient.getInstance(context);

  const secrets = await ssmClient.getSecrets([getParameterStoreSecretPath('database', secretsKey, apiName, environmentName, appId)]);

  if (_.isEmpty(secrets)) {
    return undefined;
  }

  return secrets[0].secretValue;
};

/**
 * Deletes the IAM role for the schema inspector lambda
 * @param lambdaName the function name of the schema inspector lambda
 */
export const deleteSchemaInspectorLambdaRole = async (lambdaName: string): Promise<void> => {
  const roleName = `${lambdaName}-execution-role`;
  const client = new IAMClient({});
  const command = new DeleteRoleCommand({ RoleName: roleName });
  await client.send(command);
};

/**
 * Deletes the schema inspector lambda and associated IAM role
 * @param context the Amplify CLI context
 */
export const removeVpcSchemaInspectorLambda = async (context: $TSContext): Promise<void> => {
  try {
    // Delete the lambda function
    const meta = stateManager.getMeta();
    const { AmplifyAppId, Region } = meta.providers.awscloudformation;
    const { amplify } = context;
    const { envName } = amplify.getEnvInfo();
    const lambdaName = getVpcMetadataLambdaName(AmplifyAppId, envName);

    const client = new LambdaClient({ region: Region });
    const command = new DeleteFunctionCommand({ FunctionName: lambdaName });
    await client.send(command);

    // Delete the role and policy
    await deleteSchemaInspectorLambdaRole(lambdaName);
  } catch (error) {
    printer.debug(`Error deleting the schema inspector lambda: ${error}`);
    // 1. Ignore if the AppId is not found error.
    // 2. Schema introspection will exist only on databases imported from VPC. Ignore the error on environment deletion.
  }
};

/**
 * Retrieve database connection information from SSM
 * @param context the Amplify CLI context
 * @param secretsKey the prefix of the SSM path of the parameter to store
 * @param engine the database engine type to retrieve connection info for
 */
export const getConnectionSecrets = async (
  context: $TSContext,
  secretsKey: string,
  engine: ImportedRDSType,
): Promise<{ secrets: RDSConnectionSecrets & { engine: ImportedRDSType }; storeSecrets: boolean }> => {
  const apiName = getAppSyncAPIName();
  const existingSecrets = await getExistingConnectionSecrets(context, secretsKey, apiName);
  if (existingSecrets) {
    return {
      secrets: {
        engine,
        ...existingSecrets,
      },
      storeSecrets: false,
    };
  }

  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine);
  return {
    secrets: {
      engine,
      ...databaseConfig,
    },
    storeSecrets: true,
  };
};

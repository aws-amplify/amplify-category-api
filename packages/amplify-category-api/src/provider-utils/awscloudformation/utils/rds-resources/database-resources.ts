import { $TSContext, stateManager } from '@aws-amplify/amplify-cli-core';
import _ from 'lodash';
import { getParameterStoreSecretPath } from '@aws-amplify/graphql-transformer-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { DeleteFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { DeleteRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import {
  IMPORTED_SQL_API_STRATEGY_NAME,
  ImportedDataSourceConfig,
  ImportedRDSType,
  SqlModelDataSourceDbConnectionConfig,
} from 'graphql-transformer-common';
import { getAppSyncAPIName } from '../amplify-meta-utils';
import { databaseConfigurationInputWalkthrough } from '../../service-walkthroughs/appSync-rds-db-config';
import { SSMClient } from './ssmClient';

const secretNames = ['database', 'host', 'port', 'username', 'password'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isConnectionSecrets = (obj: any): obj is ImportedDataSourceConfig => {
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
 * Get database connection values from SSM
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
): Promise<ImportedDataSourceConfig | undefined> => {
  try {
    const environmentName = envName || stateManager.getCurrentEnvName();
    const appId = stateManager.getAppID();

    const ssmClient = await SSMClient.getInstance(context);
    const secrets = await ssmClient.getSecrets(
      secretNames.map((secret) =>
        getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId, IMPORTED_SQL_API_STRATEGY_NAME),
      ),
    );

    if (_.isEmpty(secrets)) {
      return undefined;
    }

    const existingSecrets = secretNames
      .map((secretName) => {
        const secretPath = getParameterStoreSecretPath(
          secretName,
          secretsKey,
          apiName,
          environmentName,
          appId,
          IMPORTED_SQL_API_STRATEGY_NAME,
        );
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
 * Get SSM paths for database connection information and return them in a SqlModelDataSourceDbConnectionConfig shape
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
): Promise<SqlModelDataSourceDbConnectionConfig | undefined> => {
  try {
    const environmentName = envName || stateManager.getCurrentEnvName();
    const appId = stateManager.getAppID();
    const ssmClient = await SSMClient.getInstance(context);
    const secrets = await ssmClient.getSecrets(
      secretNames.map((secret) =>
        getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId, IMPORTED_SQL_API_STRATEGY_NAME),
      ),
    );

    if (_.isEmpty(secrets)) {
      return undefined;
    }

    const existingSecrets = secretNames
      .map((secretName) => {
        const secretPath = getParameterStoreSecretPath(
          secretName,
          secretsKey,
          apiName,
          environmentName,
          appId,
          IMPORTED_SQL_API_STRATEGY_NAME,
        );
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
      return {
        hostnameSsmPath: existingSecrets.host,
        databaseNameSsmPath: existingSecrets.database,
        usernameSsmPath: existingSecrets.username,
        passwordSsmPath: existingSecrets.password,
        portSsmPath: `${existingSecrets.port}`,
      };
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
  secrets: ImportedDataSourceConfig,
  apiName: string,
  secretsKey: string,
): Promise<void> => {
  const environmentName = stateManager.getCurrentEnvName();
  const appId = stateManager.getAppID();

  const ssmClient = await SSMClient.getInstance(context);
  secretNames.map(async (secret) => {
    const parameterPath = getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId, IMPORTED_SQL_API_STRATEGY_NAME);
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
    return getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, AmplifyAppId, IMPORTED_SQL_API_STRATEGY_NAME);
  });
  await ssmClient.deleteSecrets(secretParameterPaths);
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

  const secrets = await ssmClient.getSecrets([
    getParameterStoreSecretPath('database', secretsKey, apiName, environmentName, appId, IMPORTED_SQL_API_STRATEGY_NAME),
  ]);

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
): Promise<{ secrets: ImportedDataSourceConfig & { engine: ImportedRDSType }; storeSecrets: boolean }> => {
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

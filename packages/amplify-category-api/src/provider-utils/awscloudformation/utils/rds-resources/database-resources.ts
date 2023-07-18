import { $TSContext, stateManager } from '@aws-amplify/amplify-cli-core';
import _ from 'lodash';
import { getParameterStoreSecretPath, RDSConnectionSecrets, ImportedDataSourceConfig } from '@aws-amplify/graphql-transformer-core';
import { SSMClient } from './ssmClient';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { MySQLDataSourceAdapter, Schema, Engine, DataSourceAdapter, MySQLDataSourceConfig } from '@aws-amplify/graphql-schema-generator';
import { printer } from '@aws-amplify/amplify-prompts';
import { DeleteFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { DeleteRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import { getAppSyncAPIName } from '../amplify-meta-utils';
import { databaseConfigurationInputWalkthrough } from '../../service-walkthroughs/import-appsync-api-walkthrough';

const secretNames = ['database', 'host', 'port', 'username', 'password'];

export const getVpcMetadataLambdaName = (appId: string, envName: string): string => {
  if (appId && envName) {
    return `${appId}-rds-schema-inspector-${envName}`;
  }
  throw new Error("AppId and environment name are required to generate the schema inspector lambda.");
};

export const getExistingConnectionSecrets = async (context: $TSContext, secretsKey: string, apiName: string, envName?: string): Promise<RDSConnectionSecrets|undefined> => {
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
  const environmentName = stateManager.getCurrentEnvName();
  const meta = stateManager.getMeta();
  const { AmplifyAppId } = meta.providers.awscloudformation;
  if (!AmplifyAppId) {
    printer.debug(`No AppId found when deleting parameters for environment ${envName}`);
    return;
  }
  const ssmClient = await SSMClient.getInstance(context);
  const secretParameterPaths = secretNames.map(secret => {
    return getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, AmplifyAppId);
  });
  await ssmClient.deleteSecrets(secretParameterPaths);
};

// TODO: This is not used. Leaving it here for now. Generate schema step already checks for connection. 
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
export const getSecretsKey = (): string => 'schema';

export const getDatabaseName = async (context: $TSContext, apiName: string, secretsKey: string): Promise<string|undefined> => {
  const environmentName = stateManager.getCurrentEnvName();
  const appId = stateManager.getAppID();
  const ssmClient = await SSMClient.getInstance(context);

  const secrets = await ssmClient.getSecrets([getParameterStoreSecretPath('database', secretsKey, apiName, environmentName, appId)]);

  if (_.isEmpty(secrets)) {
    return;
  }

  return secrets[0].secretValue;
};

export const deleteSchemaInspectorLambdaRole = async (lambdaName: string): Promise<void> => {
  const roleName = `${lambdaName}-execution-role`;
  const client = new IAMClient({});
  const command = new DeleteRoleCommand({ RoleName: roleName });
  await client.send(command);
};

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

export const getConnectionSecrets = async (context: $TSContext, secretsKey: string, engine: ImportedRDSType): Promise<{ secrets: RDSConnectionSecrets, storeSecrets: boolean }> => {
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

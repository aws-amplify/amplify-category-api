import { $TSContext, stateManager } from 'amplify-cli-core';
import { AppSyncClient, ListApiKeysCommand, UpdateApiKeyCommand } from '@aws-sdk/client-appsync';
import { loadConfigurationForEnv } from 'amplify-provider-awscloudformation';
import { contextUtil } from '../../../category-utils/context-util';

const SECONDS_PER_DAY = 86400;

export interface ApiKeyStatus {
  expiration?: number;
  key?: string;
  apiId?: string;
  description?: string;
  exists: boolean;
}

const getAppSyncClient = async (context: $TSContext): Promise<AppSyncClient> => {
  const credentials = await loadConfigurationForEnv(context, stateManager.getCurrentEnvName());
  return new AppSyncClient({
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
    region: credentials.region,
  });
};

export const getApiKeyStatus = async (context: $TSContext): Promise<ApiKeyStatus> => {
  const appsyncClient = await getAppSyncClient(context);
  const apiName = await context.amplify.executeProviderUtils(
    context,
    'awscloudformation',
    'getAppSyncResourceName',
    {
      projectMeta: stateManager.getMeta(),
    },
  );
  const meta = stateManager.getMeta();
  const apiId = meta?.api?.[apiName]?.output?.GraphQLAPIIdOutput;
  const apiKey = meta?.api?.[apiName]?.output?.GraphQLAPIKeyOutput;
  if (!apiId || !apiKey) {
    return { exists: false };
  }
  const listApiKeysCommand = new ListApiKeysCommand({ apiId });
  const response = await appsyncClient.send(listApiKeysCommand);
  const matchingKey = response?.apiKeys?.find((key) => key?.id === apiKey);
  if (matchingKey) {
    return {
      expiration: matchingKey.expires,
      key: matchingKey.id,
      apiId,
      description: matchingKey.description,
      exists: true,
    };
  }
  return { exists: false };
};

export const updateApiKeyExpiration = async (context: $TSContext, status: ApiKeyStatus, dayOffset: number): Promise<void> => {
  const client = await getAppSyncClient(context);
  const command = new UpdateApiKeyCommand({
    apiId: status.apiId,
    description: status.description,
    expires: status.expiration + (dayOffset * SECONDS_PER_DAY),
    id: status.key,
  });
  const response = await client.send(command);
  if (response.$metadata.httpStatusCode >= 400) {
    throw new Error('Failed to update API Key extension');
  }
};

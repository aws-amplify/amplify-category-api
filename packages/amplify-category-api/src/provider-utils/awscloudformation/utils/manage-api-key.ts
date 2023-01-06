import { $TSContext, stateManager } from 'amplify-cli-core';
import { AppSyncClient, ListApiKeysCommand } from '@aws-sdk/client-appsync';
import { contextUtil } from '../../../category-utils/context-util';

export interface ApiKeyStatus {
  expiration?: number;
  exists: boolean;
}

export const getApiKeyStatus = async (context: $TSContext): ApiKeyStatus => {
  const credentials = await context.amplify.executeProviderUtils(context, 'awscloudformation', 'retrieveAwsConfig');
  const appsyncClient = new AppSyncClient({
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
    region: credentials.region,
  });
  const apiName = await contextUtil.getGraphQLAPIResourceName(context);
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
      exists: true,
    };
  }
  return { exists: false };
};

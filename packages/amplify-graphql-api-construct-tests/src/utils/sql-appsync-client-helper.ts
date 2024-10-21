import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { CognitoUser } from 'amazon-cognito-identity-js';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { TestConfigOutput } from './sql-test-config-helper';

// Reserve for future in case test AppSync API has multiple auth types
export interface AppSyncClients {
  [AUTH_TYPE.AMAZON_COGNITO_USER_POOLS]?: { [userName: string]: AWSAppSyncClient<NormalizedCacheObject> };
  [AUTH_TYPE.OPENID_CONNECT]?: { [userName: string]: AWSAppSyncClient<NormalizedCacheObject> };
  [AUTH_TYPE.API_KEY]?: AWSAppSyncClient<NormalizedCacheObject>;
  [AUTH_TYPE.AWS_IAM]?: AWSAppSyncClient<NormalizedCacheObject>;
  [AUTH_TYPE.NONE]?: AWSAppSyncClient<NormalizedCacheObject>;
  [AUTH_TYPE.AWS_LAMBDA]?: AWSAppSyncClient<NormalizedCacheObject>;
}

export const configureAppSyncClients = async (
  testConfigOutput: TestConfigOutput,
  userMap?: { [key: string]: CognitoUser },
): Promise<AppSyncClients> => {
  const { authType, apiEndpoint, apiKey, region } = testConfigOutput;
  const appSyncClients: AppSyncClients = {};

  switch (authType) {
    case AUTH_TYPE.AMAZON_COGNITO_USER_POOLS:
      expect(userMap).toBeDefined();

      appSyncClients[AUTH_TYPE.AMAZON_COGNITO_USER_POOLS] = {};

      Object.keys(userMap)?.map((userName: string) => {
        appSyncClients[AUTH_TYPE.AMAZON_COGNITO_USER_POOLS][userName] = getConfiguredAppsyncClientCognitoAuth(
          apiEndpoint,
          region,
          userMap[userName],
        );
      });

      break;
    case AUTH_TYPE.OPENID_CONNECT:
      expect(userMap).toBeDefined();

      appSyncClients[AUTH_TYPE.OPENID_CONNECT] = {};

      Object.keys(userMap)?.map((userName: string) => {
        appSyncClients[AUTH_TYPE.OPENID_CONNECT][userName] = getConfiguredAppsyncClientOIDCAuth(apiEndpoint, region, userMap[userName]);
      });

      break;
    case AUTH_TYPE.API_KEY:
      expect(apiKey).toBeDefined();

      appSyncClients[AUTH_TYPE.API_KEY] = getConfiguredAppsyncClientAPIKeyAuth(apiEndpoint, region, apiKey);

      break;
    default:
      throw new Error(`Unsupported auth type: ${authType}`);
  }

  return appSyncClients;
};

export function getConfiguredAppsyncClientCognitoAuth(
  url: string,
  region: string,
  user: CognitoUser,
): AWSAppSyncClient<NormalizedCacheObject> {
  return new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
      jwtToken: user.getSignInUserSession()?.getIdToken()?.getJwtToken(),
    },
  });
}

export function getConfiguredAppsyncClientOIDCAuth(
  url: string,
  region: string,
  user: CognitoUser,
): AWSAppSyncClient<NormalizedCacheObject> {
  return new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.OPENID_CONNECT,
      jwtToken: user.getSignInUserSession()?.getIdToken()?.getJwtToken(),
    },
  });
}

export function getConfiguredAppsyncClientAPIKeyAuth(url: string, region: string, apiKey: string): AWSAppSyncClient<NormalizedCacheObject> {
  return new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.API_KEY,
      apiKey,
    },
  });
}

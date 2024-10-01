import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { ICredentials } from '@aws-amplify/core';

export type AuthProvider = 'apiKey' | 'iam' | 'oidc' | 'userPools' | 'function';

export const configureAppSyncClients = async (
  apiEndpoint: string,
  region: string,
  authProviders: AuthProvider[],
  userMap?: { [key: string]: any },
): Promise<any> => {
  const appSyncClients: { [key: string]: any } = {};

  if (authProviders?.includes('userPools') && userMap) {
    appSyncClients['userPools'] = {};
    Object.keys(userMap)?.map((userName: string) => {
      const userAppSyncClient = getConfiguredAppsyncClientCognitoAuth(apiEndpoint, region, userMap[userName]);
      appSyncClients['userPools'][userName] = userAppSyncClient;
    });
  }

  //   if (authProviders?.includes('oidc') && userMap) {
  //     appSyncClients['oidc'] = {};
  //     Object.keys(userMap)?.map((userName: string) => {
  //       const userAppSyncClient = getConfiguredAppsyncClientOIDCAuth(apiEndPoint, appRegion, userMap[userName]);
  //       appSyncClients['oidc'][userName] = userAppSyncClient;
  //     });
  //   }

  //   if (authProviders?.includes('apiKey')) {
  //     expect(GraphQLAPIKeyOutput).toBeDefined();
  //     appSyncClients['apiKey'] = getConfiguredAppsyncClientAPIKeyAuth(apiEndPoint, appRegion, GraphQLAPIKeyOutput as string);
  //   }

  return appSyncClients;
};

export function getConfiguredAppsyncClientCognitoAuth(url: string, region: string, user: any): any {
  return new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: {
      type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
      jwtToken: user.signInUserSession.idToken.jwtToken,
    },
  });
}

import { AuthorizationConfig, AuthorizationType } from 'aws-cdk-lib/aws-appsync';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Duration, Expiration } from 'aws-cdk-lib';
import {
  AppSyncAuthConfiguration,
  AppSyncAuthConfigurationEntry,
  AppSyncAuthMode,
  ParameterManager,
  StackManagerProvider,
} from '@aws-amplify/graphql-transformer-interfaces';

const authTypeMap: Record<AppSyncAuthMode, any> = {
  API_KEY: AuthorizationType.API_KEY,
  AMAZON_COGNITO_USER_POOLS: AuthorizationType.USER_POOL,
  AWS_IAM: AuthorizationType.IAM,
  OPENID_CONNECT: AuthorizationType.OIDC,
  AWS_LAMBDA: 'AWS_LAMBDA',
};

export const IAM_AUTH_ROLE_PARAMETER = 'authRoleName';
export const IAM_UNAUTH_ROLE_PARAMETER = 'unauthRoleName';

export const adoptAuthModes = (
  stackManager: StackManagerProvider,
  parameterManager: ParameterManager,
  authConfig: AppSyncAuthConfiguration,
): AuthorizationConfig => {
  return {
    defaultAuthorization: adoptAuthMode(stackManager, parameterManager, authConfig.defaultAuthentication),
    additionalAuthorizationModes: authConfig.additionalAuthenticationProviders?.map((entry) =>
      adoptAuthMode(stackManager, parameterManager, entry),
    ),
  };
};

export const adoptAuthMode = (
  stackManager: StackManagerProvider,
  parameterManager: ParameterManager,
  entry: AppSyncAuthConfigurationEntry,
): any => {
  const authType = authTypeMap[entry.authenticationType];
  switch (entry.authenticationType) {
    case AuthorizationType.API_KEY:
      return {
        authorizationType: authType,
        apiKeyConfig: {
          description: entry.apiKeyConfig?.description,
          expires: entry.apiKeyConfig?.apiKeyExpirationDays
            ? Expiration.after(Duration.days(entry.apiKeyConfig.apiKeyExpirationDays))
            : undefined,
        },
      };
    case AuthorizationType.USER_POOL:
      // eslint-disable-next-line no-case-declarations
      const userPoolId = parameterManager.addParameter('AuthCognitoUserPoolId', {
        type: 'String',
      }).valueAsString;
      return {
        authorizationType: authType,
        userPoolConfig: {
          userPool: UserPool.fromUserPoolId(stackManager.scope, 'transformer-user-pool', userPoolId),
        },
      };
    case AuthorizationType.IAM:
      return {
        authorizationType: authType,
      };
    case AuthorizationType.OIDC:
      return {
        authorizationType: authType,
        openIdConnectConfig: {
          oidcProvider: entry.openIDConnectConfig!.issuerUrl,
          clientId: entry.openIDConnectConfig!.clientId,
          tokenExpiryFromAuth: strToNumber(entry.openIDConnectConfig!.authTTL),
          tokenExpiryFromIssue: strToNumber(entry.openIDConnectConfig!.iatTTL),
        },
      };
    case 'AWS_LAMBDA':
      return {
        authorizationType: authType,
        lambdaAuthorizerConfig: {
          lambdaFunction: entry.lambdaAuthorizerConfig!.lambdaFunction,
          ttlSeconds: strToNumber(entry.lambdaAuthorizerConfig!.ttlSeconds),
        },
      };
    default:
      throw new Error('Invalid auth config');
  }
};

const strToNumber = (input: string | number | undefined): number | undefined => {
  if (typeof input === 'string') {
    return Number.parseInt(input, 10);
  }
  return input;
};

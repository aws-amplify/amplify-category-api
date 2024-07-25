import { AuthorizationConfig, AuthorizationType } from 'aws-cdk-lib/aws-appsync';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Duration, Expiration } from 'aws-cdk-lib';
import {
  AppSyncAuthConfiguration,
  AppSyncAuthConfigurationEntry,
  AppSyncAuthMode,
  SynthParameters,
  StackManagerProvider,
} from '@aws-amplify/graphql-transformer-interfaces';

const authTypeMap: Record<AppSyncAuthMode, any> = {
  API_KEY: AuthorizationType.API_KEY,
  AMAZON_COGNITO_USER_POOLS: AuthorizationType.USER_POOL,
  AWS_IAM: AuthorizationType.IAM,
  OPENID_CONNECT: AuthorizationType.OIDC,
  AWS_LAMBDA: 'AWS_LAMBDA',
};

export const adoptAuthModes = (
  stackManager: StackManagerProvider,
  synthParameters: SynthParameters,
  authConfig: AppSyncAuthConfiguration,
): AuthorizationConfig => {
  return {
    defaultAuthorization: adoptAuthMode(stackManager, synthParameters, authConfig.defaultAuthentication),
    additionalAuthorizationModes: authConfig.additionalAuthenticationProviders?.map((entry) =>
      adoptAuthMode(stackManager, synthParameters, entry),
    ),
  };
};

export const adoptAuthMode = (
  stackManager: StackManagerProvider,
  synthParameters: SynthParameters,
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
    case AuthorizationType.USER_POOL: {
      if (!synthParameters.userPoolId) {
        throw new Error('Expected userPoolId to be present in synth parameters when user pool auth is specified.');
      }
      return {
        authorizationType: authType,
        userPoolConfig: {
          userPool: UserPool.fromUserPoolId(stackManager.scope, 'transformer-user-pool', synthParameters.userPoolId),
        },
      };
    }
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
          lambdaArn: entry.lambdaAuthorizerConfig!.lambdaArn,
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

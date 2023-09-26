import { AppSyncAuthConfiguration, AppSyncAuthConfigurationEntry, SynthParameters } from '@aws-amplify/graphql-transformer-interfaces';
import {
  AuthorizationModes,
  ApiKeyAuthorizationConfig,
  IAMAuthorizationConfig,
  LambdaAuthorizationConfig,
  OIDCAuthorizationConfig,
  UserPoolAuthorizationConfig,
} from '../types';

type AuthorizationConfigMode =
  | (IAMAuthorizationConfig & { type: 'AWS_IAM' })
  | (UserPoolAuthorizationConfig & { type: 'AMAZON_COGNITO_USER_POOLS' })
  | (OIDCAuthorizationConfig & { type: 'OPENID_CONNECT' })
  | (ApiKeyAuthorizationConfig & { type: 'API_KEY' })
  | (LambdaAuthorizationConfig & { type: 'AWS_LAMBDA' });

/**
 * Converts a single auth mode config into the amplify-internal representation.
 * @param authMode the auth mode to convert into the Appsync CDK representation.
 */
const convertAuthModeToAuthProvider = (authMode: AuthorizationConfigMode): AppSyncAuthConfigurationEntry => {
  const authenticationType = authMode.type;
  switch (authMode.type) {
    case 'API_KEY':
      return {
        authenticationType,
        apiKeyConfig: {
          description: authMode.description,
          apiKeyExpirationDays: authMode.expires.toDays(),
        },
      };
    case 'AWS_IAM':
      return { authenticationType };
    case 'AMAZON_COGNITO_USER_POOLS':
      return {
        authenticationType,
        userPoolConfig: {
          userPoolId: authMode.userPool.userPoolId,
        },
      };
    case 'OPENID_CONNECT':
      return {
        authenticationType,
        openIDConnectConfig: {
          name: authMode.oidcProviderName,
          issuerUrl: authMode.oidcIssuerUrl,
          clientId: authMode.clientId,
          iatTTL: authMode.tokenExpiryFromIssue.toSeconds(),
          authTTL: authMode.tokenExpiryFromAuth.toSeconds(),
        },
      };
    case 'AWS_LAMBDA':
      return {
        authenticationType,
        lambdaAuthorizerConfig: {
          lambdaFunction: authMode.function.functionName,
          ttlSeconds: authMode.ttl.toSeconds(),
        },
      };
    default:
      throw new Error(`Unexpected AuthMode type ${authenticationType} encountered.`);
  }
};

/**
 * Given an appsync auth configuration, convert into appsync auth provider setup.
 * @param authModes the config to transform
 * @returns the appsync config object.
 */
const convertAuthConfigToAppSyncAuth = (authModes: AuthorizationModes): AppSyncAuthConfiguration => {
  // Convert auth modes into an array of appsync configs, and include the type so we can use that for switching and partitioning later.
  const authConfig = [
    authModes.apiKeyConfig ? { type: 'API_KEY', ...authModes.apiKeyConfig } : null,
    authModes.lambdaConfig ? { type: 'AWS_LAMBDA', ...authModes.lambdaConfig } : null,
    authModes.oidcConfig ? { type: 'OPENID_CONNECT', ...authModes.oidcConfig } : null,
    authModes.userPoolConfig ? { type: 'AMAZON_COGNITO_USER_POOLS', ...authModes.userPoolConfig } : null,
    authModes.iamConfig ? { type: 'AWS_IAM', ...authModes.iamConfig } : null,
  ].filter((mode) => mode) as AuthorizationConfigMode[];
  const authProviders = authConfig.map(convertAuthModeToAuthProvider);

  // Validate inputs make sense, needs at least one mode, and a default mode is required if there are multiple modes.
  if (authProviders.length === 0) {
    throw new Error('At least one auth config is required, but none were found.');
  }
  if (authProviders.length > 1 && !authModes.defaultAuthorizationMode) {
    throw new Error('A defaultAuthorizationMode is required if multiple authorization modes are configured.');
  }

  // In the case of a single mode, defaultAuthorizationMode is not required, just use the provided value.
  if (authProviders.length === 1) {
    return {
      defaultAuthentication: authProviders[0],
      additionalAuthenticationProviders: [],
    };
  }

  // For multi-auth, partition into the defaultMode and non-default modes.
  return {
    defaultAuthentication: authProviders.filter((provider) => provider.authenticationType === authModes.defaultAuthorizationMode)[0],
    additionalAuthenticationProviders: authProviders.filter(
      (provider) => provider.authenticationType !== authModes.defaultAuthorizationMode,
    ),
  };
};

type AuthSynthParameters = Pick<SynthParameters, 'userPoolId' | 'authenticatedUserRoleName' | 'unauthenticatedUserRoleName'>;

interface AuthConfig {
  /**
   * used mainly in the before step to pass the authConfig from the transformer core down to the directive
   */
  authConfig?: AppSyncAuthConfiguration;

  /**
   * using the iam provider the resolvers checks will lets the roles in this list pass through the acm
   */
  adminRoles?: Array<string>;

  /**
   * when authorizing private/public @auth can also check authenticated/unauthenticated status for a given identityPoolId
   */
  identityPoolId?: string;

  /**
   * Params to include the transformer.
   */
  authSynthParameters: AuthSynthParameters;
}

/**
 * Convert the list of auth modes into the necessary flags and params (effectively a reducer on the rule list)
 * @param authModes the list of auth modes configured on the API.
 * @returns the AuthConfig which the AuthTransformer needs as input.
 */
export const convertAuthorizationModesToTransformerAuthConfig = (authModes: AuthorizationModes): AuthConfig => ({
  authConfig: convertAuthConfigToAppSyncAuth(authModes),
  adminRoles: authModes.adminRoles?.map((role) => role.roleName) ?? [],
  identityPoolId: authModes.iamConfig?.identityPoolId,
  authSynthParameters: getSynthParameters(authModes),
});

/**
 * Transform the authorization config into the transformer synth parameters pertaining to auth.
 * @param authModes the auth modes provided to the construct.
 * @returns a record of params to be consumed by the transformer.
 */
const getSynthParameters = (authModes: AuthorizationModes): AuthSynthParameters => ({
  ...(authModes.userPoolConfig ? { userPoolId: authModes.userPoolConfig.userPool.userPoolId } : {}),
  ...(authModes?.iamConfig
    ? {
        authenticatedUserRoleName: authModes.iamConfig.authenticatedUserRole.roleName,
        unauthenticatedUserRoleName: authModes.iamConfig.unauthenticatedUserRole.roleName,
      }
    : {}),
});

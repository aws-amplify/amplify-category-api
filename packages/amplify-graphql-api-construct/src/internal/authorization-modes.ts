import { AppSyncAuthConfiguration, AppSyncAuthConfigurationEntry } from '@aws-amplify/graphql-transformer-interfaces';
import {
  ApiKeyAuthorizationConfig,
  AuthorizationConfig,
  IAMAuthorizationConfig,
  LambdaAuthorizationConfig,
  OIDCAuthorizationConfig,
  UserPoolAuthorizationConfig,
} from '../types';

type AuthorizationConfigMode =
  | IAMAuthorizationConfig & { type: 'AWS_IAM' }
  | UserPoolAuthorizationConfig & { type: 'AMAZON_COGNITO_USER_POOLS' }
  | OIDCAuthorizationConfig & { type: 'OPENID_CONNECT' }
  | ApiKeyAuthorizationConfig & { type: 'API_KEY' }
  | LambdaAuthorizationConfig & { type: 'AWS_LAMBDA' };

/**
 * Converts a single auth mode config into the amplify-internal representation.
 * @param authMode the auth mode to convert into the Appsync CDK representation.
 */
const convertAuthModeToAuthProvider = (authMode: AuthorizationConfigMode): AppSyncAuthConfigurationEntry => {
  const authenticationType = authMode.type;
  switch (authMode.type) {
    case 'API_KEY': return {
      authenticationType,
      apiKeyConfig: {
        description: authMode.description,
        apiKeyExpirationDays: authMode.expires.toDays(),
      },
    };
    case 'AWS_IAM': return { authenticationType };
    case 'AMAZON_COGNITO_USER_POOLS': return {
      authenticationType,
      userPoolConfig: {
        userPoolId: authMode.userPool.userPoolId,
      },
    };
    case 'OPENID_CONNECT': return {
      authenticationType,
      openIDConnectConfig: {
        name: authMode.oidcProviderName,
        issuerUrl: authMode.oidcIssuerUrl,
        clientId: authMode.clientId,
        iatTTL: authMode.tokenExpiryFromIssue.toSeconds(),
        authTTL: authMode.tokenExpiryFromAuth.toSeconds(),
      },
    };
    case 'AWS_LAMBDA': return {
      authenticationType,
      lambdaAuthorizerConfig: {
        lambdaFunction: authMode.function.functionName,
        ttlSeconds: authMode.ttl.toSeconds(),
      },
    };
    default: throw new Error(`Unexpected AuthMode type ${authenticationType} encountered.`);
  }
};

/**
 * Given an appsync auth configuration, convert into appsync auth provider setup.
 * @param authConfig the config to transform
 * @returns the appsync config object.
 */
const convertAuthConfigToAppSyncAuth = (authConfig: AuthorizationConfig): AppSyncAuthConfiguration => {
  // Convert auth modes into an array of appsync configs, and include the type so we can use that for switching and partitioning later.
  const authModes = [
    authConfig.apiKeyConfig ? { type: 'API_KEY', ...authConfig.apiKeyConfig } : null,
    authConfig.lambdaConfig ? { type: 'AWS_LAMBDA', ...authConfig.lambdaConfig } : null,
    authConfig.oidcConfig ? { type: 'OPENID_CONNECT', ...authConfig.oidcConfig } : null,
    authConfig.userPoolConfig ? { type: 'AMAZON_COGNITO_USER_POOLS', ...authConfig.userPoolConfig } : null,
    authConfig.iamConfig ? { type: 'AWS_IAM', ...authConfig.iamConfig } : null,
  ].filter((mode) => mode) as AuthorizationConfigMode[];
  const authProviders = authModes.map(convertAuthModeToAuthProvider);

  // Validate inputs make sense, needs at least one mode, and a default mode is required if there are multiple modes.
  if (authProviders.length === 0) {
    throw new Error('At least one auth config is required, but none were found.');
  }
  if (authProviders.length > 1 && !authConfig.defaultAuthMode) {
    throw new Error('A defaultAuthMode is required if multiple auth modes are configured.');
  }

  // In the case of a single mode, defaultAuthMode is not required, just use the provided value.
  if (authProviders.length === 1) {
    return {
      defaultAuthentication: authProviders[0],
      additionalAuthenticationProviders: [],
    };
  }

  // For multi-auth, partition into the defaultMode and non-default modes.
  return {
    defaultAuthentication: authProviders.filter((provider) => provider.authenticationType === authConfig.defaultAuthMode)[0],
    additionalAuthenticationProviders: authProviders.filter((provider) => provider.authenticationType !== authConfig.defaultAuthMode),
  };
};

export interface AuthConfig {
  /** used mainly in the before step to pass the authConfig from the transformer core down to the directive */
  authConfig?: AppSyncAuthConfiguration;
  /** using the iam provider the resolvers checks will lets the roles in this list pass through the acm */
  adminRoles?: Array<string>;
  /** when authorizing private/public @auth can also check authenticated/unauthenticated status for a given identityPoolId */
  identityPoolId?: string;
  /**
   * Params to include the the cfnInclude statement, this is striclty part of the shim for now, and should be refactored out pre-GA.
   */
  cfnIncludeParameters: Record<string, any>;
}

/**
 * Convert the list of auth modes into the necessary flags and params (effectively a reducer on the rule list)
 * @param authConfig the list of auth modes configured on the API.
 * @returns the AuthConfig which the AuthTransformer needs as input.
 */
export const convertAuthorizationModesToTransformerAuthConfig = (authConfig: AuthorizationConfig): AuthConfig => ({
  authConfig: convertAuthConfigToAppSyncAuth(authConfig),
  adminRoles: authConfig.iamConfig?.adminRoles?.map((role) => role.roleName) ?? [],
  identityPoolId: authConfig.iamConfig?.identityPoolId,
  cfnIncludeParameters: getAuthParameters(authConfig),
});

/**
 * Hacky, but get the required auth-related params to wire into the CfnInclude statement.
 * @param authConfig the auth modes provided to the construct.
 * @returns a record of params to be consumed by the CfnInclude statement.
 */
const getAuthParameters = (authConfig: AuthorizationConfig): Record<string, any> => ({
  ...(authConfig.userPoolConfig?.userPool ? { AuthCognitoUserPoolId: authConfig.userPoolConfig.userPool.userPoolId } : {}),
  ...(authConfig?.iamConfig?.authRole ? { authRoleName: authConfig.iamConfig.authRole.roleName } : {}),
  ...(authConfig?.iamConfig?.unauthRole ? { unauthRoleName: authConfig.iamConfig.unauthRole.roleName } : {}),
});

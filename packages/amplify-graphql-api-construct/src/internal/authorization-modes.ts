import { AppSyncAuthConfiguration, AppSyncAuthConfigurationEntry } from '@aws-amplify/graphql-transformer-interfaces';
import { AuthorizationMode, IamAuthorizationMode, UserPoolAuthorizationMode } from '../types';

/**
 * Converts a single auth mode config into the amplify-internal representation.
 * @param authMode C
 */
const convertAuthModeToAuthProvider = (authMode: AuthorizationMode): AppSyncAuthConfigurationEntry => {
  switch (authMode.type) {
    case 'API_KEY': return {
      authenticationType: 'API_KEY',
      apiKeyConfig: {
        description: authMode.description,
        apiKeyExpirationDays: authMode.expires.toDays(),
      },
    };
    case 'AWS_IAM': return {
      authenticationType: 'AWS_IAM',
    };
    case 'AMAZON_COGNITO_USER_POOLS': return {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      userPoolConfig: {
        userPoolId: authMode.userPool.userPoolId,
      },
    };
    case 'OPENID_CONNECT': return {
      authenticationType: 'OPENID_CONNECT',
      openIDConnectConfig: {
        name: authMode.oidcProviderName,
        issuerUrl: authMode.oidcIssuerUrl,
        clientId: authMode.clientId,
        iatTTL: authMode.tokenExpiryFromIssue.toSeconds(),
        authTTL: authMode.tokenExpiryFromAuth.toSeconds(),
      },
    };
    case 'AWS_LAMBDA': return {
      authenticationType: 'AWS_LAMBDA',
      lambdaAuthorizerConfig: {
        lambdaFunction: authMode.function.functionName,
        ttlSeconds: authMode.ttl.toSeconds(),
      },
    };
    default: throw new Error(`Unexpected AuthMode type ${(authMode as any).type} encountered.`);
  }
};

export interface AuthConfig {
  /** used mainly in the before step to pass the authConfig from the transformer core down to the directive */
  authConfig?: AppSyncAuthConfiguration;
  /** using the iam provider the resolvers checks will lets the roles in this list pass through the acm */
  adminRoles?: Array<string>;
  /** when authorizing private/public @auth can also check authenticated/unauthenticated status for a given identityPoolId */
  identityPoolId?: string;
}

/**
 * Convert the list of auth modes into the necessary flags and params (effectively a reducer on the rule list)
 * @param authorizationModes the list of auth modes configured on the API.
 * @returns the AuthConfig which the AuthTransformer needs as input.
 */
export const convertAuthorizationModesToTransformerAuthConfig = (authorizationModes?: AuthorizationMode[]): AuthConfig => {
  // Split authmodes into a default and remaining, and convert into transformer-representation.
  if (!authorizationModes || authorizationModes.length === 0) {
    throw new Error('At least a single AuthorizationMode must be configured on the API.');
  }
  const [
    defaultAuthentication,
    ...additionalAuthenticationProviders
  ] = authorizationModes.map((authMode) => convertAuthModeToAuthProvider(authMode));

  // Extract all admin roles from all IAM Authorization modes.
  const adminRoles = authorizationModes
    .filter((authMode) => authMode.type === 'AWS_IAM')
    .flatMap((iamAuthMode) => (iamAuthMode as IamAuthorizationMode).adminRoles ?? [])
    .map((role) => role.roleArn);

  // Extract identityPoolId if configured on the API, throw if more than one is provided.
  const iamUserRoleModes = authorizationModes.filter((authMode) => authMode.type === 'AWS_IAM');
  if (iamUserRoleModes.length > 1) {
    throw new Error(`Expected at most a single AWS_IAM configuration on the API, found ${iamUserRoleModes.length}`);
  }
  const identityPoolId = iamUserRoleModes.length === 1
    ? (iamUserRoleModes[0] as IamAuthorizationMode).userRoleConfig?.identityPoolId
    : undefined;

  return {
    authConfig: {
      defaultAuthentication,
      additionalAuthenticationProviders,
    },
    adminRoles,
    identityPoolId,
  };
};

/**
 * Hacky, but get the required auth-related params to wire into the CfnInclude statement.
 * @param authorizationModes the auth modes provided to the construct.
 * @returns a record of params to be consumed by the CfnInclude statement.
 */
export const getAuthParameters = (authorizationModes: AuthorizationMode[] = []): Record<string, any> => {
  // Extract identityPoolId if configured on the API, throw if more than one is provided.
  const userPoolAuthModes = authorizationModes.filter((authMode) => authMode.type === 'AMAZON_COGNITO_USER_POOLS');
  if (userPoolAuthModes.length > 1) {
    throw new Error(`Expected at most a single AMAZON_COGNITO_USER_POOLS auth mode to be configured on the API, found ${userPoolAuthModes.length}`);
  }
  const userPoolId = userPoolAuthModes.length === 1
    ? (userPoolAuthModes[0] as UserPoolAuthorizationMode).userPool.userPoolId
    : undefined;

  const iamAuthModes = authorizationModes.filter((authMode) => authMode.type === 'AWS_IAM');
  if (iamAuthModes.length > 1) {
    throw new Error(`Expected at most a single AWS_IAM auth mode to be configured on the API, found ${iamAuthModes.length}`);
  }
  const iamAuthMode = iamAuthModes[0] as IamAuthorizationMode | undefined;

  return {
    ...(userPoolId ? { AuthCognitoUserPoolId: userPoolId } : {}),
    ...(iamAuthMode?.userRoleConfig?.authRole ? { authRoleName: iamAuthMode.userRoleConfig.authRole.roleName } : {}),
    ...(iamAuthMode?.userRoleConfig?.unauthRole ? { unauthRoleName: iamAuthMode.userRoleConfig.unauthRole.roleName } : {}),
    ...(iamAuthMode?.adminRoles ? { adminRoleArn: iamAuthMode.adminRoles.map((r) => r.roleArn).join(',') } : {}),
  };
};

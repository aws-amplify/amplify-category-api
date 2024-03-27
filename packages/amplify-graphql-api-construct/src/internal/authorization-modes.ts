import { AppSyncAuthConfiguration, AppSyncAuthConfigurationEntry, SynthParameters } from '@aws-amplify/graphql-transformer-interfaces';
import { CfnGraphQLApi } from 'aws-cdk-lib/aws-appsync';
import { isArray } from 'lodash';
import { IRole, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  AuthorizationModes,
  ApiKeyAuthorizationConfig,
  LambdaAuthorizationConfig,
  OIDCAuthorizationConfig,
  UserPoolAuthorizationConfig,
} from '../types';

type AuthorizationConfigMode =
  | { type: 'AWS_IAM' }
  | (UserPoolAuthorizationConfig & { type: 'AMAZON_COGNITO_USER_POOLS' })
  | (OIDCAuthorizationConfig & { type: 'OPENID_CONNECT' })
  | (ApiKeyAuthorizationConfig & { type: 'API_KEY' })
  | (LambdaAuthorizationConfig & { type: 'AWS_LAMBDA' });

/**
 * Validates authorization modes.
 *
 * Rules:
 * 1. Validates that deprecated settings ('iamConfig.authenticatedUserRole', 'iamConfig.unauthenticatedUserRole',
 *    'iamConfig.identityPoolId', 'iamConfig.allowListedRoles' and 'adminRoles') are mutually exclusive with new settings that
 *    replaced them ('iamConfig.enableIamAuthorizationMode' and any of 'authorizationModes.identityPoolConfig')
 * 2. If deprecated identity pool settings are used ('iamConfig.authenticatedUserRole', 'iamConfig.unauthenticatedUserRole',
 *    and 'iamConfig.identityPoolId') validate that all are provided.
 */
export const validateAuthorizationModes = (authorizationModes: AuthorizationModes): void => {
  const hasAnyDeprecatedIdentityPoolSetting =
    authorizationModes.iamConfig?.authenticatedUserRole ||
    authorizationModes.iamConfig?.unauthenticatedUserRole ||
    authorizationModes.iamConfig?.identityPoolId;
  const hasAllDeprecatedIdentityPoolSettings =
    authorizationModes.iamConfig?.authenticatedUserRole &&
    authorizationModes.iamConfig?.unauthenticatedUserRole &&
    authorizationModes.iamConfig?.identityPoolId;
  const hasDeprecatedIamSettings =
    authorizationModes.iamConfig?.authenticatedUserRole ||
    authorizationModes.iamConfig?.unauthenticatedUserRole ||
    authorizationModes.iamConfig?.identityPoolId ||
    authorizationModes.iamConfig?.allowListedRoles ||
    authorizationModes.adminRoles;
  const hasUnDeprecatedIamSettings =
    typeof authorizationModes.iamConfig?.enableIamAuthorizationMode !== 'undefined' || authorizationModes.identityPoolConfig;

  if (hasDeprecatedIamSettings && hasUnDeprecatedIamSettings) {
    throw new Error(
      'Invalid authorization modes configuration provided. ' +
        "Deprecated IAM configuration cannot be used with identity pool configuration or when 'enableIamAuthorizationMode' is specified.",
    );
  }

  if (hasAnyDeprecatedIdentityPoolSetting && !hasAllDeprecatedIdentityPoolSettings) {
    throw new Error(
      "'authorizationModes.iamConfig.authenticatedUserRole', 'authorizationModes.iamConfig.unauthenticatedUserRole' and" +
        " 'authorizationModes.iamConfig.identityPoolId' must be provided.",
    );
  }
};

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
          lambdaArn: authMode.function.functionArn,
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
    authModes.iamConfig || authModes.identityPoolConfig ? { type: 'AWS_IAM' } : null,
  ].filter((mode) => mode) as AuthorizationConfigMode[];
  const authProviders = authConfig.map(convertAuthModeToAuthProvider);

  // Validate inputs make sense, needs at least one mode, and a default mode is required if there are multiple modes.
  if (authProviders.length === 0) {
    throw new Error('At least one auth config is required, but none were found.');
  }
  if (authProviders.length > 1 && !authModes.defaultAuthorizationMode) {
    throw new Error('A defaultAuthorizationMode is required if multiple authorization modes are configured.');
  }

  // Enable appsync to invoke a provided lambda authorizer function
  authModes.lambdaConfig?.function.addPermission('appsync-auth-invoke', {
    principal: new ServicePrincipal('appsync.amazonaws.com'),
    action: 'lambda:InvokeFunction',
  });

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

type AuthSynthParameters = Pick<
  SynthParameters,
  'userPoolId' | 'authenticatedUserRoleName' | 'unauthenticatedUserRoleName' | 'identityPoolId' | 'adminRoles' | 'enableIamAccess'
>;

interface AuthConfig {
  /**
   * used mainly in the before step to pass the authConfig from the transformer core down to the directive
   */
  authConfig?: AppSyncAuthConfiguration;

  /**
   * Params to include the transformer.
   */
  authSynthParameters: AuthSynthParameters;
}

/**
 * Transforms additionalAuthenticationTypes for storage in CFN output
 */
export const getAdditionalAuthenticationTypes = (cfnGraphqlApi: CfnGraphQLApi): string | undefined => {
  if (!isArray(cfnGraphqlApi.additionalAuthenticationProviders)) {
    return undefined;
  }

  return (cfnGraphqlApi.additionalAuthenticationProviders as CfnGraphQLApi.AdditionalAuthenticationProviderProperty[])
    .map(
      (additionalAuthenticationProvider: CfnGraphQLApi.AdditionalAuthenticationProviderProperty) =>
        additionalAuthenticationProvider.authenticationType,
    )
    .join(',');
};

/**
 * Convert the list of auth modes into the necessary flags and params (effectively a reducer on the rule list)
 * @param authModes the list of auth modes configured on the API.
 * @returns the AuthConfig which the AuthTransformer needs as input.
 */
export const convertAuthorizationModesToTransformerAuthConfig = (authModes: AuthorizationModes): AuthConfig => ({
  authConfig: convertAuthConfigToAppSyncAuth(authModes),
  authSynthParameters: getSynthParameters(authModes),
});

/**
 * Merge iamConfig allowListedRoles with deprecated adminRoles property, converting to strings.
 * @param authModes the auth modes provided to the construct.
 * @returns the list of admin roles as strings to pass into the transformer
 */
const getAllowListedRoles = (authModes: AuthorizationModes): string[] =>
  [...(authModes?.iamConfig?.allowListedRoles ?? []), ...(authModes.adminRoles ?? [])].map((roleOrRoleName: IRole | string) => {
    if (typeof roleOrRoleName === 'string' || roleOrRoleName instanceof String) {
      return roleOrRoleName as string;
    }
    return roleOrRoleName.roleName;
  });

/**
 * Transform the authorization config into the transformer synth parameters pertaining to auth.
 * @param authModes the auth modes provided to the construct.
 * @returns a record of params to be consumed by the transformer.
 */
const getSynthParameters = (authModes: AuthorizationModes): AuthSynthParameters => ({
  adminRoles: getAllowListedRoles(authModes),
  identityPoolId: authModes.identityPoolConfig?.identityPoolId ?? authModes.iamConfig?.identityPoolId,
  enableIamAccess: authModes.iamConfig?.enableIamAuthorizationMode,
  ...(authModes.userPoolConfig ? { userPoolId: authModes.userPoolConfig.userPool.userPoolId } : {}),
  ...(authModes?.identityPoolConfig
    ? {
        authenticatedUserRoleName: authModes.identityPoolConfig.authenticatedUserRole.roleName,
        unauthenticatedUserRoleName: authModes.identityPoolConfig.unauthenticatedUserRole.roleName,
      }
    : {}),
  ...(authModes?.iamConfig && authModes?.iamConfig.authenticatedUserRole && authModes?.iamConfig.unauthenticatedUserRole
    ? {
        authenticatedUserRoleName: authModes.iamConfig.authenticatedUserRole?.roleName,
        unauthenticatedUserRoleName: authModes.iamConfig.unauthenticatedUserRole?.roleName,
      }
    : {}),
});

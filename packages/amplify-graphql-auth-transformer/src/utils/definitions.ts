import { GetArgumentsOptions } from '@aws-amplify/graphql-transformer-core';
import { AuthDirective } from '@aws-amplify/graphql-directives';

/**
 * AuthStrategy
 */
export type AuthStrategy = 'owner' | 'groups' | 'public' | 'private' | 'custom';
/**
 * AuthProvider
 */
export type AuthProvider = 'apiKey' | 'iam' | 'identityPool' | 'oidc' | 'userPools' | 'function';
/**
 * ModelMutation
 */
export type ModelMutation = 'create' | 'update' | 'delete';
/**
 * ModelOperation
 */
export type ModelOperation = 'create' | 'update' | 'delete' | 'get' | 'list' | 'sync' | 'search' | 'listen';

/**
 * RelationalPrimaryMapConfig
 */
export type RelationalPrimaryMapConfig = Map<string, { claim: string; field: string }>;
/**
 * SearchableConfig
 */
export interface SearchableConfig {
  queries: {
    search: string;
  };
}

export type GetAuthRulesOptions = GetArgumentsOptions & {
  isField?: boolean;
  isSqlDataSource?: boolean;
};

/**
 * RolesByProvider
 */
export interface RolesByProvider {
  cognitoStaticRoles: Array<RoleDefinition>;
  cognitoDynamicRoles: Array<RoleDefinition>;
  oidcStaticRoles: Array<RoleDefinition>;
  oidcDynamicRoles: Array<RoleDefinition>;
  iamRoles: Array<RoleDefinition>;
  apiKeyRoles: Array<RoleDefinition>;
  lambdaRoles: Array<RoleDefinition>;
}

/**
 * AuthRule
 */
export interface AuthRule {
  allow: AuthStrategy;
  provider?: AuthProvider;
  ownerField?: string;
  identityClaim?: string;
  groupsField?: string;
  groupClaim?: string;
  groups?: string[];
  operations?: ModelOperation[];
  // Used only for IAM provider to decide if an IAM policy needs to be generated. IAM auth with AdminUI does not need IAM policies
  generateIAMPolicy?: boolean;
}

/**
 * RoleDefinition
 */
export interface RoleDefinition {
  provider: AuthProvider;
  strategy: AuthStrategy;
  static: boolean;
  claim?: string;
  entity?: string;
  // specific to mutations
  allowedFields?: Array<string>;
  nullAllowedFields?: Array<string>;
  areAllFieldsAllowed?: boolean;
  areAllFieldsNullAllowed?: boolean;
  isEntityList?: boolean;
}

/**
 * AuthDirective
 */
export interface AuthDirective {
  rules: AuthRule[];
}

/**
 * ConfiguredAuthProviders
 */
export interface ConfiguredAuthProviders {
  default: AuthProvider;
  onlyDefaultAuthProviderConfigured: boolean;
  hasApiKey: boolean;
  hasUserPools: boolean;
  hasOIDC: boolean;
  hasIAM: boolean;
  hasLambda: boolean;
  hasAdminRolesEnabled: boolean;
  hasIdentityPoolId: boolean;
  shouldAddDefaultServiceDirective: boolean;
  genericIamAccessEnabled: boolean;
}

export const authDirectiveDefinition = AuthDirective.definition;

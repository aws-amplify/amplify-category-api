import { AuthProvider, AuthStrategy } from './definitions';

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
 * Compare if two auth roles are identical
 * @param role1 auth role 1
 * @param role2 auth role 2
 * @returns boolean for two roles are identical
 */
export const isIdenticalAuthRole = (role1: RoleDefinition, role2: RoleDefinition): boolean =>
  role1.provider === role2.provider &&
  role1.strategy === role2.strategy &&
  role1.static === role2.static &&
  role1.claim === role2.claim &&
  role1.entity === role2.entity;

/**
 * Determine if the given relational field role have the same access as one of the related model auth roles
 * Usually this means an auth role have the exact same provider, strategy, claim and entity
 * One special case is when the provider 'userPools' or 'oidc' exists on both sides and at least one side have 'private' role
 * @param fieldRole relational field auth role
 * @param relatedModelRoles related model auth roles
 * @returns boolean for the field can access both sides or not
 */
export const isFieldRoleHavingAccessToBothSide = (fieldRole: RoleDefinition, relatedModelRoles: RoleDefinition[]): boolean =>
  relatedModelRoles.some(
    (relatedRole) =>
      isIdenticalAuthRole(relatedRole, fieldRole) ||
      (relatedRole.provider === fieldRole.provider &&
        (relatedRole.provider === 'userPools' || relatedRole.provider === 'oidc' || relatedRole.provider === 'identityPool') &&
        (fieldRole.strategy === 'private' || relatedRole.strategy === 'private')),
  );

/**
 * Determine the given auth role is either dynamic auth role or custom auth role
 * These auth client authorization depends on the dynamic field or custom auth logic apart from the auth type
 * Which authenticates differently based on the given dynamic field value
 * @param role auth role definition
 * @returns boolean for the auth role is a dynamic or custom auth role
 */
export const isDynamicAuthOrCustomAuth = (role: RoleDefinition): boolean =>
  (role.static === false && (role.strategy === 'owner' || role.strategy === 'groups')) || role.strategy === 'custom';

import {
  Expression,
  and,
  bool,
  compoundExpression,
  equals,
  forEach,
  ifElse,
  iff,
  list,
  methodCall,
  not,
  nul,
  obj,
  or,
  parens,
  printBlock,
  qref,
  raw,
  ref,
  set,
  str,
  toJson,
  ret,
} from 'graphql-mapping-template';
import { FieldDefinitionNode } from 'graphql';
import { OPERATION_KEY } from '@aws-amplify/graphql-model-transformer';
import {
  API_KEY_AUTH_TYPE,
  DEFAULT_UNIQUE_IDENTITY_CLAIM,
  IDENTITY_CLAIM_DELIMITER,
  isAuthProviderEqual,
  RoleDefinition,
} from '../../../utils';
import { isNonCognitoIAMPrincipal, setHasAuthExpression } from '../../common';

/**
 * Generates default RDS expression
 */
export const generateDefaultRDSExpression = (iamAccessEnabled: boolean): string => {
  const exp = ref('util.unauthorized()');
  return printBlock('Default RDS Auth Resolver')(generateIAMAccessCheck(iamAccessEnabled, compoundExpression([exp, toJson(obj({}))])));
};

export const generateAuthRulesFromRoles = (
  roles: Array<RoleDefinition>,
  fields: Readonly<FieldDefinitionNode[]>,
  hasIdentityPoolId: boolean,
  hideAllowedFields = false,
): Expression[] => {
  const expressions = [];
  expressions.push(qref(methodCall(ref('ctx.stash.put'), str('hasAuth'), bool(true))), set(ref('authRules'), list([])));
  const fieldNames = fields.map((field) => field.name.value);
  expressions.push(getIamAdminRoleExpression());
  roles.forEach((role) => {
    expressions.push(convertAuthRoleToVtl(role, fieldNames, hasIdentityPoolId, hideAllowedFields));
  });
  return expressions;
};

const getIamAdminRoleExpression = (): Expression =>
  iff(
    and([ref('ctx.stash.adminRoles'), ref('ctx.stash.adminRoles.size() > 0')]),
    qref(
      methodCall(
        ref('authRules.add'),
        obj({
          provider: str('iam'),
          type: str('admin'),
          strict: bool(false),
          roles: ref('ctx.stash.adminRoles'),
        }),
      ),
    ),
  );

const convertAuthRoleToVtl = (
  role: RoleDefinition,
  fields: string[],
  hasIdentityPoolId: boolean,
  hideAllowedFields = false,
): Expression => {
  const allowedFields = getAllowedFields(role, fields).map((field) => str(field));
  const showAllowedFields = allowedFields && !hideAllowedFields && allowedFields.length > 0;
  // Api Key
  if (isAuthProviderEqual(role.provider, 'apiKey')) {
    return qref(
      methodCall(
        ref('authRules.add'),
        obj({
          type: str('public'),
          provider: str('apiKey'),
          ...(showAllowedFields && { allowedFields: list(allowedFields) }),
        }),
      ),
    );
  }

  // Lambda Authorizer
  else if (isAuthProviderEqual(role.provider, 'function')) {
    return qref(
      methodCall(
        ref('authRules.add'),
        obj({
          type: str('custom'),
          provider: str('function'),
          ...(showAllowedFields && { allowedFields: list(allowedFields) }),
        }),
      ),
    );
  }

  // Identity Pool (formerly known as IAM)
  else if (isAuthProviderEqual(role.provider, 'identityPool')) {
    return qref(
      methodCall(
        ref('authRules.add'),
        obj({
          type: str(role.strategy),
          provider: str('iam'),
          roleArn: role.strategy === 'public' ? ref('ctx.stash.unauthRole') : ref('ctx.stash.authRole'),
          ...(role.strategy === 'private' && { cognitoIdentityPoolId: hasIdentityPoolId ? ref('ctx.stash.identityPoolId') : nul() }),
          ...(showAllowedFields && { allowedFields: list(allowedFields) }),
        }),
      ),
    );
  }

  // User Pools or OIDC
  else if (isAuthProviderEqual(role.provider, 'userPools') || isAuthProviderEqual(role.provider, 'oidc')) {
    if (role.strategy === 'private') {
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str(role.provider),
            ...(showAllowedFields && { allowedFields: list(allowedFields) }),
          }),
        ),
      );
    } else if (role.strategy === 'groups' && role.static) {
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str(role.provider),
            allowedGroups: list([str(role.entity)]),
            groupClaim: str(role.claim),
            ...(showAllowedFields && { allowedFields: list(allowedFields) }),
          }),
        ),
      );
    } else if (role.strategy === 'owner') {
      const usingCognitoDefaultClaim = role.claim === DEFAULT_UNIQUE_IDENTITY_CLAIM && isAuthProviderEqual(role.provider, 'userPools');
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str(role.provider),
            ownerFieldName: str(role.entity),
            ownerFieldType: str(role.isEntityList ? 'string[]' : 'string'),
            ...(!usingCognitoDefaultClaim && { identityClaim: str(role.claim) }),
            ...(showAllowedFields && { allowedFields: list(allowedFields) }),
          }),
        ),
      );
    } else if (role.strategy === 'groups' && !role.static) {
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str(role.provider),
            groupsFieldName: str(role.entity),
            groupsFieldType: str(role.isEntityList ? 'string[]' : 'string'),
            groupClaim: str(role.claim),
            ...(showAllowedFields && { allowedFields: list(allowedFields) }),
          }),
        ),
      );
    }
  }
  throw new Error(`Invalid Auth Rule: Unable to process ${JSON.stringify(role)}`);
};

const getAllowedFields = (role: RoleDefinition, fields: string[]): string[] => {
  if (role.allowedFields && role.allowedFields.length > 0) {
    return role.allowedFields;
  }
  return fields;
};

export const validateAuthResult = (): Expression => {
  return compoundExpression([
    iff(
      or([not(ref('authResult')), parens(and([ref('authResult'), not(ref('authResult.authorized'))]))]),
      methodCall(ref('util.unauthorized')),
    ),
  ]);
};

export const constructAuthFilter = (): Expression => {
  return iff(
    and([ref('authResult'), not(methodCall(ref('util.isNullOrEmpty'), ref('authResult.authFilter')))]),
    set(ref('ctx.stash.authFilter'), ref('authResult.authFilter')),
  );
};

export const constructAuthorizedInputStatement = (keyName: string): Expression =>
  iff(
    and([ref('authResult'), not(methodCall(ref('util.isNullOrEmpty'), ref('authResult.authorizedInput')))]),
    set(ref(keyName), ref('authResult.authorizedInput')),
  );

/**
 * Generates sandbox expression for field
 */
export const generateSandboxExpressionForField = (sandboxEnabled: boolean, genericIamAccessEnabled: boolean): string => {
  const expressions: Array<Expression> = [];
  if (sandboxEnabled) {
    expressions.push(iff(equals(methodCall(ref('util.authType')), str(API_KEY_AUTH_TYPE)), ret(toJson(obj({})))));
  }
  if (genericIamAccessEnabled) {
    expressions.push(iff(isNonCognitoIAMPrincipal, ret(toJson(obj({})))));
  }
  expressions.push(methodCall(ref('util.unauthorized')));
  return printBlock(`Sandbox Mode ${sandboxEnabled ? 'Enabled' : 'Disabled'}`)(compoundExpression(expressions));
};

export const emptyPayload = toJson(raw(JSON.stringify({ version: '2018-05-29', payload: {} })));

/**
 * Creates expression to deny field flag
 */
export const setDeniedFieldFlag = (operation: string, subscriptionsEnabled: boolean): string => {
  if (subscriptionsEnabled) {
    return printBlock('Check if subscriptions is protected')(
      compoundExpression([
        iff(
          equals(methodCall(ref('util.defaultIfNull'), methodCall(ref('ctx.source.get'), str(OPERATION_KEY)), nul()), str(operation)),
          qref(methodCall(ref('ctx.stash.put'), str('deniedField'), bool(true))),
        ),
      ]),
    );
  }
  return '';
};

/**
 * Creates field resolver for owner
 */
export const generateFieldResolverForOwner = (entity: string): string => {
  const expressions: Expression[] = [
    ifElse(
      methodCall(ref('util.isList'), ref(`ctx.source.${entity}`)),
      compoundExpression([
        set(ref('ownerEntitiesList'), list([])),
        set(ref(entity), ref(`ctx.source.${entity}`)),
        forEach(ref('entities'), ref(entity), [
          set(ref('ownerEntities'), ref(`entities.split("${IDENTITY_CLAIM_DELIMITER}")`)),
          set(ref('ownerEntitiesLastIdx'), raw('$ownerEntities.size() - 1')),
          set(ref('ownerEntitiesLast'), ref('ownerEntities[$ownerEntitiesLastIdx]')),
          qref(methodCall(ref('ownerEntitiesList.add'), ref('ownerEntitiesLast'))),
        ]),
        qref(methodCall(ref(`ctx.source.${entity}.put`), ref('ownerEntitiesList'))),
        toJson(ref('ownerEntitiesList')),
      ]),
      compoundExpression([
        set(ref('ownerEntities'), ref(`ctx.source.${entity}.split("${IDENTITY_CLAIM_DELIMITER}")`)),
        set(ref('ownerEntitiesLastIdx'), raw('$ownerEntities.size() - 1')),
        set(ref('ownerEntitiesLast'), ref('ownerEntities[$ownerEntitiesLastIdx]')),
        qref(methodCall(ref('ctx.source.put'), str(entity), ref('ownerEntitiesLast'))),
        toJson(ref(`ctx.source.${entity}`)),
      ]),
    ),
  ];

  return printBlock('Parse owner field auth for Get')(compoundExpression(expressions));
};

/**
 * If generic IAM access is enabled add check that bypasses rules evaluation for any IAM principal
 * that is not related to Cognito Identity Pool.
 */
export const generateIAMAccessCheck = (enableIamAccess: boolean, expression: Expression): Expression => {
  if (!enableIamAccess) {
    // No-op if generic IAM access is not enabled.
    return expression;
  }
  return ifElse(isNonCognitoIAMPrincipal, compoundExpression([setHasAuthExpression, emptyPayload]), expression);
};

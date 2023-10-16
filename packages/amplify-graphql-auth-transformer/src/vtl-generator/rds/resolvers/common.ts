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
  notEquals,
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
} from 'graphql-mapping-template';
import { FieldDefinitionNode } from 'graphql';
import { OPERATION_KEY } from '@aws-amplify/graphql-model-transformer';
import { API_KEY_AUTH_TYPE, IDENTITY_CLAIM_DELIMITER, RoleDefinition } from '../../../utils';

/**
 * Generates default RDS expression
 */
export const generateDefaultRDSExpression = (): string => {
  const exp = ref('util.unauthorized()');
  return printBlock('Default RDS Auth Resolver')(compoundExpression([exp, toJson(obj({}))]));
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
  roles.forEach((role) => {
    expressions.push(convertAuthRoleToVtl(role, fieldNames, hasIdentityPoolId, hideAllowedFields));
  });
  return expressions;
};

const convertAuthRoleToVtl = (
  role: RoleDefinition,
  fields: string[],
  hasIdentityPoolId: boolean,
  hideAllowedFields = false,
): Expression => {
  const allowedFields = getAllowedFields(role, fields).map((field) => str(field));
  const showAllowedFields = allowedFields && !hideAllowedFields && allowedFields.length > 0;
  // Api Key
  if (role.provider === 'apiKey') {
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
  else if (role.provider === 'function') {
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

  // IAM
  else if (role.provider === 'iam') {
    return qref(
      methodCall(
        ref('authRules.add'),
        obj({
          type: str(role.strategy),
          provider: str('iam'),
          roleArn: role.strategy === 'public' ? ref('ctx.stash.unauthRole') : ref('ctx.stash.authRole'),
          ...(role.strategy === 'private' && { cognitoIdentityPoolId: identityPoolId ? str(identityPoolId) : nul() }),
          ...(showAllowedFields && { allowedFields: list(allowedFields) }),
        }),
      ),
    );
  }

  // User Pools or OIDC
  else if (role.provider === 'userPools' || role.provider === 'oidc') {
    if (role.strategy === 'private') {
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str('userPools'),
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
            provider: str('userPools'),
            allowedGroups: list([str(role.entity)]),
            identityClaim: str(role.claim),
            ...(showAllowedFields && { allowedFields: list(allowedFields) }),
          }),
        ),
      );
    } else if (role.strategy === 'owner') {
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str('userPools'),
            ownerFieldName: str(role.entity),
            ownerFieldType: str(role.isEntityList ? 'string[]' : 'string'),
            identityClaim: str(role.claim),
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
            provider: str('userPools'),
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
export const generateSandboxExpressionForField = (sandboxEnabled: boolean): string => {
  let exp: Expression;
  if (sandboxEnabled) exp = iff(notEquals(methodCall(ref('util.authType')), str(API_KEY_AUTH_TYPE)), methodCall(ref('util.unauthorized')));
  else exp = ref('util.unauthorized()');
  return printBlock(`Sandbox Mode ${sandboxEnabled ? 'Enabled' : 'Disabled'}`)(compoundExpression([exp, toJson(obj({}))]));
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

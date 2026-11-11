import { FieldDefinitionNode } from 'graphql';
import {
  compoundExpression,
  iff,
  raw,
  set,
  ref,
  forEach,
  bool,
  Expression,
  not,
  obj,
  list,
  qref,
  equals,
  str,
  and,
  methodCall,
  toJson,
  printBlock,
  ifElse,
  nul,
  or,
} from 'graphql-mapping-template';
import {
  API_KEY_AUTH_TYPE,
  COGNITO_AUTH_TYPE,
  LAMBDA_AUTH_TYPE,
  ConfiguredAuthProviders,
  IAM_AUTH_TYPE,
  OIDC_AUTH_TYPE,
  RoleDefinition,
  splitRoles,
  fieldIsList,
  IS_AUTHORIZED_FLAG,
  ALLOWED_FIELDS,
  NULL_ALLOWED_FIELDS,
  DENIED_FIELDS,
} from '../../../utils';
import { setHasAuthExpression } from '../../common';

// Combinator keys of a ModelXConditionInput. These do not name a field; their
// values are nested condition maps (`not`) or lists of them (`and`/`or`).
const CONDITION_COMBINATORS = ['and', 'or', 'not'];

/**
 * VTL that denies a field-restricted caller any `condition` referencing a field
 * outside their allowed set.
 *
 * `ctx.args.condition` is a map whose keys are either field names or the logical
 * combinators `and` / `or` / `not`. A field key not in `$allowedFields` or
 * `$nullAllowedFields` is an access the caller does not have, so it is added to
 * `$deniedFields` and the existing `Unauthorized on ...` error (emitted right
 * after this block) fires.
 *
 * Combinators nest more condition maps, so a worklist seeds from the top-level
 * condition and, for each combinator encountered, pushes its child map(s) back
 * onto the worklist. VTL (Apache Velocity) has no real recursion; the worklist is
 * drained by a bounded loop so an arbitrarily deep combinator tree is still fully
 * walked without relying on call depth.
 */
const conditionFieldAccessCheck = (): Expression[] => [
  iff(
    not(methodCall(ref('util.isNull'), ref('ctx.args.condition'))),
    compoundExpression([
      // Re-parse the condition argument into a plain map. `$ctx.args.condition` is
      // the raw GraphQL-argument object; calling list/map Java methods on it (or on
      // its nested values) is not supported by the AppSync VTL runtime. Routing it
      // through util.toJson/util.parseJson materializes a plain map/list structure
      // whose entrySet()/keySet() behave, the same pattern getInputFields() uses.
      set(ref('conditionMap'), methodCall(ref('util.parseJson'), methodCall(ref('util.toJson'), ref('ctx.args.condition')))),
      // allowed := allowedFields + nullAllowedFields (the fields this caller may touch)
      set(ref('allowedConditionFields'), list([])),
      qref(methodCall(ref('allowedConditionFields.addAll'), ref(ALLOWED_FIELDS))),
      qref(methodCall(ref('allowedConditionFields.addAll'), ref(NULL_ALLOWED_FIELDS))),
      set(ref('conditionCombinators'), raw(JSON.stringify(CONDITION_COMBINATORS))),
      // Flatten the condition's field keys, descending through the and/or/not
      // combinators to a bounded depth. Velocity has no recursion, so each depth is
      // an explicit pass over a list of maps; the next depth's maps are gathered as
      // we go. Combinator nesting past this depth is rare and would only cause the
      // check to miss a very deeply nested field, never to wrongly allow a top-level
      // one. The lists are built with util.toJson/parseJson so every value is a plain
      // map/list the runtime can iterate.
      set(ref('conditionLevel'), list([ref('conditionMap')])),
      raw('#foreach( $depth in [0..9] )'),
      set(ref('nextConditionLevel'), list([])),
      forEach(ref('levelMap'), ref('conditionLevel'), [
        forEach(ref('conditionEntry'), ref('levelMap.entrySet()'), [
          ifElse(
            methodCall(ref('conditionCombinators.contains'), ref('conditionEntry.key')),
            // combinator: `and`/`or` hold a list of condition maps, `not` holds one map.
            // Gather child maps for the next depth.
            ifElse(
              methodCall(ref('util.isList'), ref('conditionEntry.value')),
              forEach(ref('nestedCondition'), ref('conditionEntry.value'), [
                iff(
                  methodCall(ref('util.isMap'), ref('nestedCondition')),
                  qref(methodCall(ref('nextConditionLevel.add'), ref('nestedCondition'))),
                ),
              ]),
              iff(
                methodCall(ref('util.isMap'), ref('conditionEntry.value')),
                qref(methodCall(ref('nextConditionLevel.add'), ref('conditionEntry.value'))),
              ),
            ),
            // field key: deny it if the caller is not allowed to access that field
            iff(
              not(methodCall(ref('allowedConditionFields.contains'), ref('conditionEntry.key'))),
              qref(methodCall(ref(`${DENIED_FIELDS}.put`), ref('conditionEntry.key'), str(''))),
            ),
          ),
        ]),
      ]),
      // descend; stop early once no combinator children remain. #break and the range
      // are raw because the ref helper would prefix `$`, which a Velocity range and
      // the #break directive must not carry.
      iff(ref('nextConditionLevel.isEmpty()'), raw('#break')),
      set(ref('conditionLevel'), ref('nextConditionLevel')),
      raw('#end'),
    ]),
  ),
];
import {
  getIdentityClaimExp,
  responseCheckForErrors,
  getInputFields,
  iamCheck,
  iamAdminRoleCheckExpression,
  generateOwnerClaimExpression,
  generateOwnerClaimListExpression,
  generateOwnerMultiClaimExpression,
  generateInvalidClaimsCondition,
  generateIAMAccessCheck,
} from './helpers';

/**
 * There is only one role for ApiKey we can use the first index
 */
const apiKeyExpression = (roles: Array<RoleDefinition>): Expression | null => {
  const expression = new Array<Expression>();
  if (roles.length === 0) {
    return iff(equals(ref('util.authType()'), str(API_KEY_AUTH_TYPE)), ref('util.unauthorized()'));
  }

  if (roles[0].areAllFieldsAllowed && roles[0].areAllFieldsNullAllowed) {
    expression.push(set(ref(IS_AUTHORIZED_FLAG), bool(true)));
  } else {
    expression.push(
      set(ref(`${ALLOWED_FIELDS}`), raw(JSON.stringify(roles[0].allowedFields))),
      set(ref(`${NULL_ALLOWED_FIELDS}`), raw(JSON.stringify(roles[0].nullAllowedFields))),
    );
  }
  return iff(equals(ref('util.authType()'), str(API_KEY_AUTH_TYPE)), compoundExpression(expression));
};

/**
 * There is only one role for Lambda we can use the first index
 */
const lambdaExpression = (roles: Array<RoleDefinition>): Expression | null => {
  const expression = new Array<Expression>();
  if (roles.length === 0) {
    return iff(equals(ref('util.authType()'), str(LAMBDA_AUTH_TYPE)), ref('util.unauthorized()'));
  }
  if (roles[0].areAllFieldsAllowed && roles[0].areAllFieldsNullAllowed) {
    expression.push(set(ref(IS_AUTHORIZED_FLAG), bool(true)));
  } else {
    expression.push(
      set(ref(`${ALLOWED_FIELDS}`), raw(JSON.stringify(roles[0].allowedFields))),
      set(ref(`${NULL_ALLOWED_FIELDS}`), raw(JSON.stringify(roles[0].nullAllowedFields))),
    );
  }
  return iff(equals(ref('util.authType()'), str(LAMBDA_AUTH_TYPE)), compoundExpression(expression));
};

const iamExpression = (
  roles: Array<RoleDefinition>,
  hasAdminRolesEnabled = false,
  hasIdentityPoolId: boolean,
  genericIamAccessEnabled: boolean,
): Expression => {
  const expression = new Array<Expression>();
  // allow if using an admin role
  if (hasAdminRolesEnabled) {
    expression.push(iamAdminRoleCheckExpression());
  }
  if (roles.length > 0) {
    roles.forEach((role) => {
      if (role.areAllFieldsAllowed && role.areAllFieldsNullAllowed) {
        expression.push(iamCheck(role.claim!, set(ref(IS_AUTHORIZED_FLAG), bool(true)), hasIdentityPoolId));
      } else {
        expression.push(
          iamCheck(
            role.claim!,
            compoundExpression([
              set(ref(`${ALLOWED_FIELDS}`), raw(JSON.stringify(role.allowedFields))),
              set(ref(`${NULL_ALLOWED_FIELDS}`), raw(JSON.stringify(role.nullAllowedFields))),
            ]),
            hasIdentityPoolId,
          ),
        );
      }
    });
  } else {
    expression.push(ref('util.unauthorized()'));
  }

  return iff(
    equals(ref('util.authType()'), str(IAM_AUTH_TYPE)),
    generateIAMAccessCheck(genericIamAccessEnabled, compoundExpression(expression)),
  );
};

const generateStaticRoleExpression = (roles: Array<RoleDefinition>): Expression[] => {
  const staticRoleExpression: Array<Expression> = [];
  const privateRoleIdx = roles.findIndex((r) => r.strategy === 'private');
  if (privateRoleIdx > -1) {
    const privateRole = roles[privateRoleIdx];
    if (privateRole.areAllFieldsAllowed && privateRole.areAllFieldsNullAllowed) {
      staticRoleExpression.push(set(ref(IS_AUTHORIZED_FLAG), bool(true)));
    } else {
      staticRoleExpression.push(
        qref(methodCall(ref(`${ALLOWED_FIELDS}.addAll`), raw(JSON.stringify(privateRole.allowedFields)))),
        qref(methodCall(ref(`${NULL_ALLOWED_FIELDS}.addAll`), raw(JSON.stringify(privateRole.nullAllowedFields)))),
      );
    }
    roles.splice(privateRoleIdx, 1);
  }
  if (roles.length > 0) {
    staticRoleExpression.push(
      iff(
        not(ref(IS_AUTHORIZED_FLAG)),
        compoundExpression([
          set(
            ref('staticGroupRoles'),
            raw(
              JSON.stringify(
                roles.map((r) => ({
                  claim: r.claim,
                  entity: r.entity,
                  allowedFields: r.allowedFields,
                  nullAllowedFields: r.nullAllowedFields,
                  isAuthorizedOnAllFields: r.areAllFieldsAllowed && r.areAllFieldsNullAllowed,
                })),
              ),
            ),
          ),
          forEach(/** for */ ref('groupRole'), /** in */ ref('staticGroupRoles'), [
            set(ref('groupsInToken'), getIdentityClaimExp(ref('groupRole.claim'), list([]))),
            iff(
              methodCall(ref('groupsInToken.contains'), ref('groupRole.entity')),
              addAllowedFieldsIfElse('groupRole.allowedFields', 'groupRole.nullAllowedFields', 'groupRole.isAuthorizedOnAllFields', true),
            ),
          ]),
        ]),
      ),
    );
  }
  return staticRoleExpression;
};
const dynamicGroupRoleExpression = (roles: Array<RoleDefinition>, fields: ReadonlyArray<FieldDefinitionNode>): Array<Expression> => {
  const ownerExpression = new Array<Expression>();
  const dynamicGroupExpression = new Array<Expression>();
  roles.forEach((role, idx) => {
    const entityIsList = fieldIsList(fields, role.entity!);
    if (role.strategy === 'owner') {
      ownerExpression.push(
        iff(
          not(ref(IS_AUTHORIZED_FLAG)),
          compoundExpression([
            set(
              ref(`ownerEntity${idx}`),
              methodCall(ref('util.defaultIfNull'), ref(`ctx.result.${role.entity!}`), entityIsList ? list([]) : nul()),
            ),
            generateOwnerClaimExpression(role.claim!, `ownerClaim${idx}`),
            iff(
              generateInvalidClaimsCondition(role.claim!, `ownerClaim${idx}`),
              compoundExpression([
                generateOwnerMultiClaimExpression(role.claim!, `ownerClaim${idx}`),
                generateOwnerClaimListExpression(role.claim!, `ownerClaimsList${idx}`),
                set(ref(`ownerAllowedFields${idx}`), raw(JSON.stringify(role.allowedFields))),
                set(ref(`ownerNullAllowedFields${idx}`), raw(JSON.stringify(role.nullAllowedFields))),
                set(ref(`isAuthorizedOnAllFields${idx}`), bool(role.areAllFieldsAllowed && role.areAllFieldsNullAllowed)),
                ...(entityIsList
                  ? [
                      forEach(ref('allowedOwner'), ref(`ownerEntity${idx}`), [
                        iff(
                          or([
                            equals(ref('allowedOwner'), ref(`ownerClaim${idx}`)),
                            methodCall(ref(`ownerClaimsList${idx}.contains`), ref('allowedOwner')),
                          ]),
                          addAllowedFieldsIfElse(
                            `ownerAllowedFields${idx}`,
                            `ownerNullAllowedFields${idx}`,
                            `isAuthorizedOnAllFields${idx}`,
                            true,
                          ),
                        ),
                      ]),
                    ]
                  : [
                      iff(
                        or([
                          equals(ref(`ownerEntity${idx}`), ref(`ownerClaim${idx}`)),
                          methodCall(ref(`ownerClaimsList${idx}.contains`), ref(`ownerEntity${idx}`)),
                        ]),
                        addAllowedFieldsIfElse(`ownerAllowedFields${idx}`, `ownerNullAllowedFields${idx}`, `isAuthorizedOnAllFields${idx}`),
                      ),
                    ]),
              ]),
            ),
          ]),
        ),
      );
    }
    if (role.strategy === 'groups') {
      dynamicGroupExpression.push(
        iff(
          not(ref(IS_AUTHORIZED_FLAG)),
          compoundExpression([
            set(
              ref(`groupEntity${idx}`),
              methodCall(ref('util.defaultIfNull'), ref(`ctx.result.${role.entity}`), entityIsList ? list([]) : nul()),
            ),
            set(ref(`groupClaim${idx}`), getIdentityClaimExp(str(role.claim!), list([]))),
            set(ref(`groupAllowedFields${idx}`), raw(JSON.stringify(role.allowedFields))),
            set(ref(`groupNullAllowedFields${idx}`), raw(JSON.stringify(role.nullAllowedFields))),
            set(ref(`isAuthorizedOnAllFields${idx}`), bool(role.areAllFieldsAllowed && role.areAllFieldsNullAllowed)),
            iff(
              methodCall(ref('util.isString'), ref(`groupClaim${idx}`)),
              ifElse(
                methodCall(ref('util.isList'), methodCall(ref('util.parseJson'), ref(`groupClaim${idx}`))),
                set(ref(`groupClaim${idx}`), methodCall(ref('util.parseJson'), ref(`groupClaim${idx}`))),
                set(ref(`groupClaim${idx}`), list([ref(`groupClaim${idx}`)])),
              ),
            ),
            forEach(ref('userGroup'), ref(`groupClaim${idx}`), [
              iff(
                entityIsList
                  ? methodCall(ref(`groupEntity${idx}.contains`), ref('userGroup'))
                  : equals(ref(`groupEntity${idx}`), ref('userGroup')),

                addAllowedFieldsIfElse(`groupAllowedFields${idx}`, `groupNullAllowedFields${idx}`, `isAuthorizedOnAllFields${idx}`, true),
              ),
            ]),
          ]),
        ),
      );
    }
  });
  return [...(ownerExpression.length > 0 ? ownerExpression : []), ...(dynamicGroupExpression.length > 0 ? dynamicGroupExpression : [])];
};

/**
 * For update we need to check for allowed fields and null allowed fields
 * unauthorized if
 *  - none of the roles have been met and there are no field conditions
 *  - role is partially allowed but the field conditions have not been met
 */
export const generateAuthExpressionForUpdate = (
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
): string => {
  const { cognitoStaticRoles, cognitoDynamicRoles, oidcStaticRoles, oidcDynamicRoles, apiKeyRoles, iamRoles, lambdaRoles } =
    splitRoles(roles);
  const totalAuthExpressions: Array<Expression> = [
    setHasAuthExpression,
    responseCheckForErrors(),
    getInputFields(),
    set(ref(IS_AUTHORIZED_FLAG), bool(false)),
    set(ref(`${ALLOWED_FIELDS}`), list([])),
    set(ref(`${NULL_ALLOWED_FIELDS}`), list([])),
    set(ref(`${DENIED_FIELDS}`), obj({})),
  ];
  if (providers.hasApiKey) {
    totalAuthExpressions.push(apiKeyExpression(apiKeyRoles));
  }
  if (providers.hasLambda) {
    totalAuthExpressions.push(lambdaExpression(lambdaRoles));
  }
  if (providers.hasIAM) {
    totalAuthExpressions.push(
      iamExpression(iamRoles, providers.hasAdminRolesEnabled, providers.hasIdentityPoolId, providers.genericIamAccessEnabled),
    );
  }
  if (providers.hasUserPools) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(COGNITO_AUTH_TYPE)),
        compoundExpression([
          ...generateStaticRoleExpression(cognitoStaticRoles),
          ...dynamicGroupRoleExpression(cognitoDynamicRoles, fields),
        ]),
      ),
    );
  }
  if (providers.hasOIDC) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(OIDC_AUTH_TYPE)),
        compoundExpression([...generateStaticRoleExpression(oidcStaticRoles), ...dynamicGroupRoleExpression(oidcDynamicRoles, fields)]),
      ),
    );
  }
  totalAuthExpressions.push(
    iff(
      and([not(ref(IS_AUTHORIZED_FLAG)), ref(`${ALLOWED_FIELDS}.isEmpty()`), ref(`${NULL_ALLOWED_FIELDS}.isEmpty()`)]),
      ref('util.unauthorized()'),
    ),
    // if not authorized we check the field conditions
    iff(
      not(ref(IS_AUTHORIZED_FLAG)),
      compoundExpression([
        forEach(ref('entry'), ref('util.map.copyAndRetainAllKeys($ctx.args.input, $inputFields).entrySet()'), [
          iff(
            and([methodCall(ref('util.isNull'), ref('entry.value')), not(ref(`${NULL_ALLOWED_FIELDS}.contains($entry.key)`))]),
            qref(methodCall(ref(`${DENIED_FIELDS}.put`), ref('entry.key'), str(''))),
          ),
        ]),
        forEach(ref('deniedField'), ref(`util.list.copyAndRemoveAll($inputFields, $${ALLOWED_FIELDS})`), [
          qref(methodCall(ref(`${DENIED_FIELDS}.put`), ref('deniedField'), str(''))),
        ]),
        // A field-restricted caller must not use `condition` to probe fields they
        // cannot access: a DynamoDB conditional check leaks whether a guessed value
        // matched via success vs ConditionalCheckFailedException, recovering the value
        // of a field the caller is not authorized for. The `input` sweep above does
        // not cover `condition`, so collect every field named in `ctx.args.condition`
        // (skipping the `and`/`or`/`not` combinators, which nest more field maps) and
        // deny any that is outside the caller's allowed set. The worklist walks the
        // nested combinators so a condition wrapped in `and`/`or`/`not` is covered too.
        ...conditionFieldAccessCheck(),
      ]),
    ),
    iff(
      ref(`${DENIED_FIELDS}.keySet().size() > 0`),
      methodCall(ref('util.error'), str(`Unauthorized on \${${DENIED_FIELDS}.keySet()}`), str('Unauthorized')),
    ),
  );
  return printBlock('Authorization Steps')(compoundExpression([...totalAuthExpressions, toJson(obj({}))]));
};

const addAllowedFieldsIfElse = (allowedFieldsKey: string, nullAllowedFieldsKey: string, condition: string, breakLoop = false): Expression =>
  ifElse(
    ref(condition),
    compoundExpression([set(ref(IS_AUTHORIZED_FLAG), bool(true)), ...(breakLoop ? [raw('#break')] : [])]),
    compoundExpression([
      qref(methodCall(ref(`${ALLOWED_FIELDS}.addAll`), ref(allowedFieldsKey))),
      qref(methodCall(ref(`${NULL_ALLOWED_FIELDS}.addAll`), ref(nullAllowedFieldsKey))),
    ]),
  );

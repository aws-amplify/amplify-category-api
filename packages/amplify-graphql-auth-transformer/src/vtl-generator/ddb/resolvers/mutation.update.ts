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
  READABLE_FIELDS,
} from '../../../utils';
import { setHasAuthExpression } from '../../common';
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
 * The model fields a `condition` must be checked against: those that at least one
 * mutation role cannot read. A field every role can read (the primary key,
 * timestamps, and any field without a field-level read restriction) carries no
 * protected value and is always safe to condition on, so it is left out of the
 * runtime check -- otherwise a role whose readable set happens to omit such a
 * field (e.g. an owner's set does not list `updatedAt`) would wrongly reject a
 * legitimate condition on it.
 */
const conditionRestrictedFields = (roles: Array<RoleDefinition>, fields: ReadonlyArray<FieldDefinitionNode>): string[] => {
  const fieldNames = fields.map((field) => field.name.value);
  return fieldNames.filter((fieldName) => roles.some((role) => !(role.readableFields ?? fieldNames).includes(fieldName)));
};

/**
 * VTL that denies any `condition` referencing a field no matched role can read.
 *
 * A DynamoDB conditional check leaks whether a guessed value matched (success vs
 * ConditionalCheckFailedException), so a `condition` on a field the caller cannot
 * read is a read oracle on that field. `$readableFields` is the union of the
 * fields readable by the roles that matched (accumulated alongside the write auth
 * above); a field outside it must not appear in the condition.
 *
 * The condition is serialized once with `util.toJson` and each non-readable model
 * field is matched against that string as `"<field>":`. A condition input only
 * ever emits a field as a JSON object key in that exact form, and serializing
 * flattens every `and` / `or` / `not` nesting into the same string, so this is
 * independent of how deeply the field is wrapped -- no tree walk, no depth bound,
 * and it fails closed. The model field names are known at transform time; the
 * logical combinators `and` / `or` / `not` are never model fields, so they are
 * not in the baked list and are skipped for free.
 */
const conditionFieldAccessCheck = (fieldNames: ReadonlyArray<string>): Expression[] => {
  if (fieldNames.length === 0) {
    return [];
  }
  return [
    iff(
      not(methodCall(ref('util.isNull'), ref('ctx.args.condition'))),
      compoundExpression([
        set(ref('conditionJson'), methodCall(ref('util.toJson'), ref('ctx.args.condition'))),
        set(ref('conditionFieldNames'), raw(JSON.stringify(fieldNames))),
        forEach(ref('conditionField'), ref('conditionFieldNames'), [
          // Needle is the field name as a JSON object key: util.toJson quotes the
          // name (`"field"`) without needing a literal quote in the template, and
          // the `:` pins it to a key position rather than a substring of a value.
          // The `${...}` is Velocity interpolation in the generated VTL, not a JS
          // template literal.
          // eslint-disable-next-line no-template-curly-in-string
          set(ref('conditionFieldKey'), raw('"${util.toJson($conditionField)}:"')),
          iff(
            and([
              not(methodCall(ref(`${READABLE_FIELDS}.contains`), ref('conditionField'))),
              methodCall(ref('conditionJson.contains'), ref('conditionFieldKey')),
            ]),
            qref(methodCall(ref(`${DENIED_FIELDS}.put`), ref('conditionField'), str(''))),
          ),
        ]),
      ]),
    ),
  ];
};

/**
 * There is only one role for ApiKey we can use the first index
 */
const apiKeyExpression = (roles: Array<RoleDefinition>): Expression | null => {
  const expression = new Array<Expression>();
  if (roles.length === 0) {
    return iff(equals(ref('util.authType()'), str(API_KEY_AUTH_TYPE)), ref('util.unauthorized()'));
  }

  // The role matched (this auth type), so its readable fields join the set a
  // `condition` may reference, even when authorized on all write fields.
  expression.push(set(ref(`${READABLE_FIELDS}`), raw(JSON.stringify(roles[0].readableFields ?? []))));
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
  // The role matched (this auth type), so its readable fields join the set a
  // `condition` may reference, even when authorized on all write fields.
  expression.push(set(ref(`${READABLE_FIELDS}`), raw(JSON.stringify(roles[0].readableFields ?? []))));
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
        expression.push(
          iamCheck(
            role.claim!,
            compoundExpression([
              // The role matched, so its readable fields join the condition set
              // even though it is authorized on all write fields.
              qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), raw(JSON.stringify(role.readableFields ?? [])))),
              set(ref(IS_AUTHORIZED_FLAG), bool(true)),
            ]),
            hasIdentityPoolId,
          ),
        );
      } else {
        expression.push(
          iamCheck(
            role.claim!,
            compoundExpression([
              qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), raw(JSON.stringify(role.readableFields ?? [])))),
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
    // A private role matches unconditionally, so its readable fields always join
    // the set a `condition` may reference.
    staticRoleExpression.push(qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), raw(JSON.stringify(privateRole.readableFields ?? [])))));
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
                  readableFields: r.readableFields ?? [],
                  isAuthorizedOnAllFields: r.areAllFieldsAllowed && r.areAllFieldsNullAllowed,
                })),
              ),
            ),
          ),
          forEach(/** for */ ref('groupRole'), /** in */ ref('staticGroupRoles'), [
            set(ref('groupsInToken'), getIdentityClaimExp(ref('groupRole.claim'), list([]))),
            iff(
              methodCall(ref('groupsInToken.contains'), ref('groupRole.entity')),
              addAllowedFieldsIfElse(
                'groupRole.allowedFields',
                'groupRole.nullAllowedFields',
                'groupRole.readableFields',
                'groupRole.isAuthorizedOnAllFields',
                true,
              ),
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
                set(ref(`ownerReadableFields${idx}`), raw(JSON.stringify(role.readableFields ?? []))),
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
                            `ownerReadableFields${idx}`,
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
                        addAllowedFieldsIfElse(
                          `ownerAllowedFields${idx}`,
                          `ownerNullAllowedFields${idx}`,
                          `ownerReadableFields${idx}`,
                          `isAuthorizedOnAllFields${idx}`,
                        ),
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
            set(ref(`groupReadableFields${idx}`), raw(JSON.stringify(role.readableFields ?? []))),
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

                addAllowedFieldsIfElse(
                  `groupAllowedFields${idx}`,
                  `groupNullAllowedFields${idx}`,
                  `groupReadableFields${idx}`,
                  `isAuthorizedOnAllFields${idx}`,
                  true,
                ),
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
    set(ref(`${READABLE_FIELDS}`), list([])),
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
    // if not authorized we check the field conditions on the input
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
      ]),
    ),
    // The read-oracle guard runs regardless of write authorization: a caller
    // authorized on every write field can still lack READ on some field, and a
    // `condition` on it would leak its value through the DynamoDB conditional
    // check. $readableFields is the union of fields the matched role(s) may read.
    ...conditionFieldAccessCheck(conditionRestrictedFields(roles, fields)),
    iff(
      ref(`${DENIED_FIELDS}.keySet().size() > 0`),
      methodCall(ref('util.error'), str(`Unauthorized on \${${DENIED_FIELDS}.keySet()}`), str('Unauthorized')),
    ),
  );
  return printBlock('Authorization Steps')(compoundExpression([...totalAuthExpressions, toJson(obj({}))]));
};

const addAllowedFieldsIfElse = (
  allowedFieldsKey: string,
  nullAllowedFieldsKey: string,
  readableFieldsKey: string,
  condition: string,
  breakLoop = false,
): Expression =>
  compoundExpression([
    // The role matched, so its readable fields join the set a `condition` may
    // reference -- regardless of whether it is authorized on all write fields
    // (the shortcut below) or only some. Read permission is tracked separately
    // from write because a role can be writable-everywhere yet not read every
    // field.
    qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), ref(readableFieldsKey))),
    ifElse(
      ref(condition),
      compoundExpression([set(ref(IS_AUTHORIZED_FLAG), bool(true)), ...(breakLoop ? [raw('#break')] : [])]),
      compoundExpression([
        qref(methodCall(ref(`${ALLOWED_FIELDS}.addAll`), ref(allowedFieldsKey))),
        qref(methodCall(ref(`${NULL_ALLOWED_FIELDS}.addAll`), ref(nullAllowedFieldsKey))),
      ]),
    ),
  ]);

import { FieldDefinitionNode } from 'graphql';
import {
  Expression,
  printBlock,
  compoundExpression,
  bool,
  equals,
  iff,
  raw,
  ref,
  set,
  str,
  methodCall,
  forEach,
  list,
  not,
  nul,
  ifElse,
  or,
  and,
  qref,
  obj,
} from 'graphql-mapping-template';
import {
  API_KEY_AUTH_TYPE,
  COGNITO_AUTH_TYPE,
  LAMBDA_AUTH_TYPE,
  ConfiguredAuthProviders,
  fieldIsList,
  IAM_AUTH_TYPE,
  IS_AUTHORIZED_FLAG,
  OIDC_AUTH_TYPE,
  RoleDefinition,
  splitRoles,
  READABLE_FIELDS,
  DENIED_FIELDS,
} from '../../../utils';
import { setHasAuthExpression } from '../../common';
import {
  emptyPayload,
  getIdentityClaimExp,
  iamAdminRoleCheckExpression,
  iamCheck,
  generateOwnerClaimExpression,
  generateOwnerClaimListExpression,
  generateOwnerMultiClaimExpression,
  generateInvalidClaimsCondition,
  generateIAMAccessCheck,
} from './helpers';

/**
 * The model fields a `condition` must be checked against: those at least one
 * mutation role cannot read. A field every role can read (primary key,
 * timestamps, any field without a field-level read restriction) is always safe
 * to condition on and is left out, so a role whose readable set happens to omit
 * it does not wrongly reject a legitimate condition on it.
 */
const conditionRestrictedFields = (roles: Array<RoleDefinition>, fields: ReadonlyArray<FieldDefinitionNode>): string[] => {
  const fieldNames = fields.map((field) => field.name.value);
  return fieldNames.filter((fieldName) => roles.some((role) => !(role.readableFields ?? fieldNames).includes(fieldName)));
};

/**
 * VTL that denies any `condition` referencing a field no matched role can read.
 *
 * Same read-oracle guard as the update resolver: a DynamoDB conditional check
 * leaks whether a guessed value matched (success vs ConditionalCheckFailedException),
 * so a `condition` on a field the caller cannot read is a read oracle on it.
 * `$readableFields` is the union of fields readable by the matched role(s). The
 * condition is serialized once with `util.toJson` and each non-readable model
 * field is matched against that string as `"<field>":`; serializing flattens
 * every `and` / `or` / `not` nesting into one string, so the check is independent
 * of nesting depth and fails closed.
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
          // name without a literal quote in the template, and `:` pins it to a key
          // position rather than a substring of a value. The `${...}` is Velocity
          // interpolation in the generated VTL, not a JS template literal.
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
  expression.push(
    set(ref(`${READABLE_FIELDS}`), raw(JSON.stringify(roles[0].readableFields ?? []))),
    set(ref(IS_AUTHORIZED_FLAG), bool(true)),
  );
  return iff(equals(ref('util.authType()'), str(API_KEY_AUTH_TYPE)), compoundExpression(expression));
};
/**
 * No need to combine allowed fields as the request can only be signed by one iam role
 */
const iamExpression = (
  roles: Array<RoleDefinition>,
  hasAdminRolesEnabled = false,
  hasIdentityPoolId: boolean,
  genericIamAccessEnabled: boolean,
): Expression | null => {
  const expression = new Array<Expression>();
  // allow if using an admin role
  if (hasAdminRolesEnabled) {
    expression.push(iamAdminRoleCheckExpression());
  }
  if (roles.length > 0) {
    roles.forEach((role) => {
      expression.push(
        iamCheck(
          role.claim!,
          compoundExpression([
            qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), raw(JSON.stringify(role.readableFields ?? [])))),
            set(ref(IS_AUTHORIZED_FLAG), bool(true)),
          ]),
          hasIdentityPoolId,
        ),
      );
    });
  } else {
    expression.push(ref('util.unauthorized()'));
  }

  return iff(
    equals(ref('util.authType()'), str(IAM_AUTH_TYPE)),
    generateIAMAccessCheck(genericIamAccessEnabled, compoundExpression(expression)),
  );
};

/**
 * There is only one role for Lambda we can use the first index
 */
const lambdaExpression = (roles: Array<RoleDefinition>): Expression | null => {
  const expression = new Array<Expression>();
  if (roles.length === 0) {
    return iff(equals(ref('util.authType()'), str(LAMBDA_AUTH_TYPE)), ref('util.unauthorized()'));
  }
  expression.push(
    set(ref(`${READABLE_FIELDS}`), raw(JSON.stringify(roles[0].readableFields ?? []))),
    set(ref(IS_AUTHORIZED_FLAG), bool(true)),
  );

  return iff(equals(ref('util.authType()'), str(LAMBDA_AUTH_TYPE)), compoundExpression(expression));
};

const generateStaticRoleExpression = (roles: Array<RoleDefinition>): Array<Expression> => {
  const staticRoleExpression: Array<Expression> = [];
  const privateRoleIdx = roles.findIndex((r) => r.strategy === 'private');
  if (privateRoleIdx > -1) {
    // A private role matches unconditionally; its readable fields always join the
    // condition set.
    staticRoleExpression.push(
      qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), raw(JSON.stringify(roles[privateRoleIdx].readableFields ?? [])))),
      set(ref(IS_AUTHORIZED_FLAG), bool(true)),
    );
    roles.splice(privateRoleIdx, -1);
  }
  if (roles.length > 0) {
    staticRoleExpression.push(
      iff(
        not(ref(IS_AUTHORIZED_FLAG)),
        compoundExpression([
          set(
            ref('staticGroupRoles'),
            raw(JSON.stringify(roles.map((r) => ({ claim: r.claim, entity: r.entity, readableFields: r.readableFields ?? [] })))),
          ),
          forEach(/** for */ ref('groupRole'), /** in */ ref('staticGroupRoles'), [
            set(ref('groupsInToken'), getIdentityClaimExp(ref('groupRole.claim'), list([]))),
            iff(
              methodCall(ref('groupsInToken.contains'), ref('groupRole.entity')),
              compoundExpression([
                qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), ref('groupRole.readableFields'))),
                set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                raw('#break'),
              ]),
            ),
          ]),
        ]),
      ),
    );
  }
  return staticRoleExpression;
};

const dynamicGroupRoleExpression = (roles: Array<RoleDefinition>, fields: ReadonlyArray<FieldDefinitionNode>): Expression[] => {
  const ownerExpression = new Array<Expression>();
  const dynamicGroupExpression = new Array<Expression>();
  roles.forEach((role, idx) => {
    const entityIsList = fieldIsList(fields, role.entity!);
    if (role.strategy === 'owner') {
      ownerExpression.push(
        iff(
          not(ref(IS_AUTHORIZED_FLAG)),
          compoundExpression([
            set(ref(`ownerEntity${idx}`), methodCall(ref('util.defaultIfNull'), ref(`ctx.result.${role.entity!}`), nul())),
            generateOwnerClaimExpression(role.claim!, `ownerClaim${idx}`),
            iff(
              generateInvalidClaimsCondition(role.claim!, `ownerClaim${idx}`),
              compoundExpression([
                generateOwnerMultiClaimExpression(role.claim!, `ownerClaim${idx}`),
                generateOwnerClaimListExpression(role.claim!, `ownerClaimsList${idx}`),
                set(ref(`ownerReadableFields${idx}`), raw(JSON.stringify(role.readableFields ?? []))),
                ...(entityIsList
                  ? [
                      forEach(ref('allowedOwner'), ref(`ownerEntity${idx}`), [
                        iff(
                          or([
                            equals(ref('allowedOwner'), ref(`ownerClaim${idx}`)),
                            methodCall(ref(`ownerClaimsList${idx}.contains`), ref('allowedOwner')),
                          ]),
                          compoundExpression([
                            qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), ref(`ownerReadableFields${idx}`))),
                            set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                          ]),
                        ),
                      ]),
                    ]
                  : [
                      iff(
                        or([
                          equals(ref(`ownerEntity${idx}`), ref(`ownerClaim${idx}`)),
                          methodCall(ref(`ownerClaimsList${idx}.contains`), ref(`ownerEntity${idx}`)),
                        ]),
                        compoundExpression([
                          qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), ref(`ownerReadableFields${idx}`))),
                          set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                        ]),
                      ),
                    ]),
              ]),
            ),
          ]),
          // if authorized result != owner claim or result not in owner claim list, update owner to identity claim
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
            set(ref(`groupReadableFields${idx}`), raw(JSON.stringify(role.readableFields ?? []))),
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
                compoundExpression([
                  qref(methodCall(ref(`${READABLE_FIELDS}.addAll`), ref(`groupReadableFields${idx}`))),
                  set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                ]),
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
 * Generates auth expression for delete
 */
export const generateAuthExpressionForDelete = (
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
): string => {
  const { cognitoStaticRoles, cognitoDynamicRoles, oidcStaticRoles, oidcDynamicRoles, apiKeyRoles, iamRoles, lambdaRoles } =
    splitRoles(roles);
  const totalAuthExpressions: Array<Expression> = [
    setHasAuthExpression,
    set(ref(IS_AUTHORIZED_FLAG), bool(false)),
    set(ref(`${READABLE_FIELDS}`), list([])),
    set(ref(`${DENIED_FIELDS}`), obj({})),
  ];
  if (providers.hasApiKey) {
    totalAuthExpressions.push(apiKeyExpression(apiKeyRoles));
  }
  if (providers.hasIAM) {
    totalAuthExpressions.push(
      iamExpression(iamRoles, providers.hasAdminRolesEnabled, providers.hasIdentityPoolId, providers.genericIamAccessEnabled),
    );
  }
  if (providers.hasLambda) {
    totalAuthExpressions.push(lambdaExpression(lambdaRoles));
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
  totalAuthExpressions.push(iff(not(ref(IS_AUTHORIZED_FLAG)), ref('util.unauthorized()')));
  // An authorized caller must not use `condition` as a read oracle on a field it
  // cannot read. $readableFields holds the union of fields the matched role(s)
  // may read; deny a condition on anything outside it.
  totalAuthExpressions.push(
    ...conditionFieldAccessCheck(conditionRestrictedFields(roles, fields)),
    iff(
      ref(`${DENIED_FIELDS}.keySet().size() > 0`),
      methodCall(ref('util.error'), str(`Unauthorized on \${${DENIED_FIELDS}.keySet()}`), str('Unauthorized')),
    ),
  );
  return printBlock('Authorization Steps')(compoundExpression([...totalAuthExpressions, emptyPayload]));
};

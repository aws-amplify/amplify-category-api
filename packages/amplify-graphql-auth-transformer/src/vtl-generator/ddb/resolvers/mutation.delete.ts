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
  generateGroupCheckExpressions,
} from './helpers';

/**
 * There is only one role for ApiKey we can use the first index
 */
const apiKeyExpression = (roles: Array<RoleDefinition>): Expression | null => {
  const expression = new Array<Expression>();
  if (roles.length === 0) {
    return iff(equals(ref('util.authType()'), str(API_KEY_AUTH_TYPE)), ref('util.unauthorized()'));
  }
  expression.push(set(ref(IS_AUTHORIZED_FLAG), bool(true)));
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
      expression.push(iamCheck(role.claim!, set(ref(IS_AUTHORIZED_FLAG), bool(true)), hasIdentityPoolId));
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
  expression.push(set(ref(IS_AUTHORIZED_FLAG), bool(true)));

  return iff(equals(ref('util.authType()'), str(LAMBDA_AUTH_TYPE)), compoundExpression(expression));
};

const generateStaticRoleExpression = (roles: Array<RoleDefinition>): Array<Expression> => {
  const staticRoleExpression: Array<Expression> = [];
  const privateRoleIdx = roles.findIndex((r) => r.strategy === 'private');
  if (privateRoleIdx > -1) {
    staticRoleExpression.push(set(ref(IS_AUTHORIZED_FLAG), bool(true)));
    roles.splice(privateRoleIdx, -1);
  }
  if (roles.length > 0) {
    staticRoleExpression.push(
      iff(
        not(ref(IS_AUTHORIZED_FLAG)),
        compoundExpression([
          set(ref('staticGroupRoles'), raw(JSON.stringify(roles.map((r) => ({ claim: r.claim, entity: r.entity }))))),
          forEach(/** for */ ref('groupRole'), /** in */ ref('staticGroupRoles'), [
            set(ref('groupsInToken'), getIdentityClaimExp(ref('groupRole.claim'), list([]))),
            iff(
              methodCall(ref('groupsInToken.contains'), ref('groupRole.entity')),
              compoundExpression([set(ref(IS_AUTHORIZED_FLAG), bool(true)), raw('#break')]),
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
      // AND logic: check if user is in required groups before authorizing owner
      const { groupCheck, groupCondition } = generateGroupCheckExpressions(role.operationGroups?.delete, role.groupClaim, idx);

      ownerExpression.push(
        ...groupCheck,
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
                ...(entityIsList
                  ? [
                      forEach(ref('allowedOwner'), ref(`ownerEntity${idx}`), [
                        iff(
                          groupCondition(
                            or([
                              equals(ref('allowedOwner'), ref(`ownerClaim${idx}`)),
                              methodCall(ref(`ownerClaimsList${idx}.contains`), ref('allowedOwner')),
                            ]),
                          ),
                          set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                        ),
                      ]),
                    ]
                  : [
                      iff(
                        groupCondition(
                          or([
                            equals(ref(`ownerEntity${idx}`), ref(`ownerClaim${idx}`)),
                            methodCall(ref(`ownerClaimsList${idx}.contains`), ref(`ownerEntity${idx}`)),
                          ]),
                        ),
                        set(ref(IS_AUTHORIZED_FLAG), bool(true)),
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
                set(ref(IS_AUTHORIZED_FLAG), bool(true)),
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
  const totalAuthExpressions: Array<Expression> = [setHasAuthExpression, set(ref(IS_AUTHORIZED_FLAG), bool(false))];
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
  return printBlock('Authorization Steps')(compoundExpression([...totalAuthExpressions, emptyPayload]));
};

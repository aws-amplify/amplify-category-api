import { OPERATION_KEY } from '@aws-amplify/graphql-model-transformer';
import { FieldDefinitionNode } from 'graphql';
import {
  bool,
  compoundExpression,
  equals,
  Expression,
  forEach,
  ifElse,
  iff,
  list,
  methodCall,
  not,
  nul,
  obj,
  or,
  printBlock,
  qref,
  raw,
  ref,
  ret,
  set,
  str,
  toJson,
} from 'graphql-mapping-template';
import {
  API_KEY_AUTH_TYPE,
  COGNITO_AUTH_TYPE,
  ConfiguredAuthProviders,
  fieldIsList,
  IS_AUTHORIZED_FLAG,
  OIDC_AUTH_TYPE,
  RoleDefinition,
  splitRoles,
} from '../../../utils';
import { isNonCognitoIAMPrincipal } from '../../common';
import {
  apiKeyExpression,
  emptyPayload,
  generateInvalidClaimsCondition,
  generateOwnerClaimExpression,
  generateOwnerClaimListExpression,
  generateOwnerMultiClaimExpression,
  generateStaticRoleExpression,
  getIdentityClaimExp,
  iamExpression,
  lambdaExpression,
} from './helpers';

// Field Read VTL Functions
const generateDynamicAuthReadExpression = (roles: Array<RoleDefinition>, fields: ReadonlyArray<FieldDefinitionNode>): Expression[] => {
  const ownerExpressions = new Array<Expression>();
  const dynamicGroupExpressions = new Array<Expression>();
  roles.forEach((role, idx) => {
    const entityIsList = fieldIsList(fields, role.entity!);
    if (role.strategy === 'owner') {
      ownerExpressions.push(
        iff(
          not(ref(IS_AUTHORIZED_FLAG)),
          compoundExpression([
            set(ref(`ownerEntity${idx}`), methodCall(ref('util.defaultIfNull'), ref(`ctx.source.${role.entity!}`), nul())),
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
                          or([
                            equals(ref('allowedOwner'), ref(`ownerClaim${idx}`)),
                            methodCall(ref(`ownerClaimsList${idx}.contains`), ref('allowedOwner')),
                          ]),
                          compoundExpression([set(ref(IS_AUTHORIZED_FLAG), bool(true)), raw('#break')]),
                        ),
                      ]),
                    ]
                  : [
                      iff(
                        or([
                          equals(ref(`ownerEntity${idx}`), ref(`ownerClaim${idx}`)),
                          methodCall(ref(`ownerClaimsList${idx}.contains`), ref(`ownerEntity${idx}`)),
                        ]),
                        set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                      ),
                    ]),
              ]),
            ),
          ]),
        ),
      );
    }
    if (role.strategy === 'groups') {
      dynamicGroupExpressions.push(
        iff(
          not(ref(IS_AUTHORIZED_FLAG)),
          compoundExpression([
            set(ref(`groupEntity${idx}`), methodCall(ref('util.defaultIfNull'), ref(`ctx.source.${role.entity!}`), nul())),
            set(ref(`groupClaim${idx}`), getIdentityClaimExp(str(role.claim), list([]))),
            iff(
              methodCall(ref('util.isString'), ref(`groupClaim${idx}`)),
              ifElse(
                methodCall(ref('util.isList'), methodCall(ref('util.parseJson'), ref(`groupClaim${idx}`))),
                set(ref(`groupClaim${idx}`), methodCall(ref('util.parseJson'), ref(`groupClaim${idx}`))),
                set(ref(`groupClaim${idx}`), list([ref(`groupClaim${idx}`)])),
              ),
            ),
            entityIsList
              ? forEach(ref('userGroup'), ref(`groupClaim${idx}`), [
                  iff(
                    methodCall(ref(`groupEntity${idx}.contains`), ref('userGroup')),
                    compoundExpression([set(ref(IS_AUTHORIZED_FLAG), bool(true)), raw('#break')]),
                  ),
                ])
              : iff(ref(`groupClaim${idx}.contains($groupEntity${idx})`), set(ref(IS_AUTHORIZED_FLAG), bool(true))),
          ]),
        ),
      );
    }
  });
  return [...(ownerExpressions.length > 0 || dynamicGroupExpressions.length > 0 ? [...ownerExpressions, ...dynamicGroupExpressions] : [])];
};

/**
 * Generates an auth expression for field
 */
export const generateAuthExpressionForField = (
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
  fieldName: string = undefined,
): string => {
  const { cognitoStaticRoles, cognitoDynamicRoles, oidcStaticRoles, oidcDynamicRoles, iamRoles, apiKeyRoles, lambdaRoles } =
    splitRoles(roles);
  const totalAuthExpressions: Array<Expression> = [set(ref(IS_AUTHORIZED_FLAG), bool(false))];
  if (providers.hasApiKey) {
    totalAuthExpressions.push(apiKeyExpression(apiKeyRoles));
  }
  if (providers.hasLambda) {
    totalAuthExpressions.push(lambdaExpression(lambdaRoles));
  }
  if (providers.hasIAM) {
    totalAuthExpressions.push(
      iamExpression({
        roles: iamRoles,
        adminRolesEnabled: providers.hasAdminRolesEnabled,
        hasIdentityPoolId: providers.hasIdentityPoolId,
        genericIamAccessEnabled: providers.genericIamAccessEnabled,
        fieldName,
      }),
    );
  }
  if (providers.hasUserPools) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(COGNITO_AUTH_TYPE)),
        compoundExpression([
          ...generateStaticRoleExpression(cognitoStaticRoles),
          ...generateDynamicAuthReadExpression(cognitoDynamicRoles, fields),
        ]),
      ),
    );
  }
  if (providers.hasOIDC) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(OIDC_AUTH_TYPE)),
        compoundExpression([
          ...generateStaticRoleExpression(oidcStaticRoles),
          ...generateDynamicAuthReadExpression(oidcDynamicRoles, fields),
        ]),
      ),
    );
  }
  totalAuthExpressions.push(iff(not(ref(IS_AUTHORIZED_FLAG)), ref('util.unauthorized()')));
  return printBlock('Field Authorization Steps')(compoundExpression([...totalAuthExpressions, emptyPayload]));
};

/**
 * This is the response resolver for fields to protect subscriptions
 */
export const generateFieldAuthResponse = (operation: string, fieldName: string, subscriptionsEnabled: boolean): string => {
  if (subscriptionsEnabled) {
    return printBlock('Checking for allowed operations which can return this field')(
      compoundExpression([
        set(ref('operation'), methodCall(ref('util.defaultIfNull'), methodCall(ref('ctx.source.get'), str(OPERATION_KEY)), nul())),
        ifElse(equals(ref('operation'), str(operation)), toJson(nul()), toJson(ref(`context.source["${fieldName}"]`))),
      ]),
    );
  }
  return printBlock('Return Source Field')(toJson(ref(`context.source["${fieldName}"]`)));
};

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
 * Generates a post auth expression for a field.
 *
 * 1. Pass through if 'ctx.stash.hasAuth' is true (auth directive is present)
 * 2. Pass through for API key auth type if sandbox is enabled.
 * 3. Pass through for IAM auth type if generic IAM access is enabled and principal is not coming from Cognito.
 * 4. Otherwise, rejects as unauthorized.
 *
 * @param sandboxEnabled a flag indicating if sandbox is enabled.
 * @param genericIamAccessEnabled a flag indicating if generic IAM access is enabled.
 * @returns an expression.
 */
export const generatePostAuthExpressionForField = (sandboxEnabled: boolean, genericIamAccessEnabled: boolean): string => {
  const expressions: Array<Expression> = [];
  if (sandboxEnabled) {
    expressions.push(iff(equals(methodCall(ref('util.authType')), str(API_KEY_AUTH_TYPE)), ret(toJson(obj({})))));
  }
  if (genericIamAccessEnabled) {
    expressions.push(iff(isNonCognitoIAMPrincipal, ret(toJson(obj({})))));
  }
  expressions.push(methodCall(ref('util.unauthorized')));
  return printBlock(
    `Sandbox Mode ${sandboxEnabled ? 'Enabled' : 'Disabled'}, IAM Access ${genericIamAccessEnabled ? 'Enabled' : 'Disabled'}`,
  )(compoundExpression(expressions));
};

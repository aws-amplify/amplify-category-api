import {
  bool,
  compoundExpression,
  equals,
  Expression,
  iff,
  methodCall,
  not,
  ref,
  set,
  str,
  nul,
  printBlock,
  or,
  raw,
  qref,
  and,
  list,
  forEach,
  comment,
  ifElse,
} from 'graphql-mapping-template';
import {
  COGNITO_AUTH_TYPE,
  ConfiguredAuthProviders,
  IS_AUTHORIZED_FLAG,
  OIDC_AUTH_TYPE,
  RoleDefinition,
  splitRoles,
} from '../utils';
import {
  generateStaticRoleExpression,
  apiKeyExpression,
  iamExpression,
  lambdaExpression,
  emptyPayload,
  setHasAuthExpression,
  generateOwnerClaimExpression,
  generateOwnerClaimListExpression,
  getIdentityClaimExp,
  getOwnerClaimReference,
} from './helpers';

const dynamicRoleExpression = (roles: Array<RoleDefinition>): Array<Expression> => {
  const dynamicExpression = new Array<Expression>();
  const ownerExpression = new Array<Expression>();
  const groupExpression = new Array<Expression>();
  // we only check against owner rules which are not list fields
  roles.forEach((role, idx) => {
    if (role.strategy === 'owner') {
      const ownerClaimRef = getOwnerClaimReference(role.claim!, `ownerClaim${idx}`);
      ownerExpression.push(
        generateOwnerClaimExpression(role.claim!, `ownerClaim${idx}`),
        generateOwnerClaimListExpression(role.claim!, `ownerClaimsList${idx}`),
        qref(methodCall(ref('authOwnerRuntimeFilter.add'), raw(`{ "${role.entity}": { "${role.isEntityList ? 'contains' : 'eq'}": $${ownerClaimRef} } }`))),
        set(
          ref(`ownerEntity${idx}`),
          methodCall(ref('util.defaultIfNull'), ref(`ctx.args.${role.entity!}`), nul()),
        ),
        iff(
          not(ref(IS_AUTHORIZED_FLAG)),
          compoundExpression([
            iff(
              or([
                equals(ref(`ownerEntity${idx}`), ref(`ownerClaim${idx}`)),
                methodCall(ref(`ownerClaimsList${idx}.contains`), ref(`ownerEntity${idx}`)),
              ]),
              set(ref(IS_AUTHORIZED_FLAG), bool(true)),
            ),
          ]),
        ),
      );
    } else if (role.strategy === 'groups' && !role.static) {
      // Loop through the cognito groups and set as runtime filter
      groupExpression.push(
        set(ref(`groupClaim${idx}`), getIdentityClaimExp(str(role.claim!), list([]))),
        iff(
          methodCall(ref('util.isString'), ref(`groupClaim${idx}`)),
          ifElse(
            methodCall(ref('util.isList'), methodCall(ref('util.parseJson'), ref(`groupClaim${idx}`))),
            set(ref(`groupClaim${idx}`), methodCall(ref('util.parseJson'), ref(`groupClaim${idx}`))),
            set(ref(`groupClaim${idx}`), list([ref(`groupClaim${idx}`)])),
          ),
        ),
        forEach(ref('groupRole'), ref(`groupClaim${idx}`), [
          qref(methodCall(ref('authGroupRuntimeFilter.add'), raw(`{ "${role.entity}": { "${role.isEntityList ? 'contains' : 'eq'}": $groupRole } }`))),
        ]),
      );
    }
  });

  dynamicExpression.push(
    ...combineAuthExpressionAndFilter(ownerExpression, groupExpression),
  );

  return dynamicExpression;
};

const combineAuthExpressionAndFilter = (ownerExpression: Array<Expression>, groupExpression: Array<Expression>): Array<Expression> => [
  set(ref('authRuntimeFilter'), raw('[]')),
  set(ref('authOwnerRuntimeFilter'), raw('[]')),
  set(ref('authGroupRuntimeFilter'), raw('[]')),
  ...(ownerExpression.length > 0 ? ownerExpression : []),
  ...(groupExpression.length > 0 ? groupExpression : []),
  comment('Apply dynamic roles auth if not previously authorized by static groups and owner argument'),
  iff(
    raw('$authOwnerRuntimeFilter.size() > 0'),
    forEach(ref('ownerAuthFilter'), ref('authOwnerRuntimeFilter'), [
      qref(methodCall(ref('authRuntimeFilter.add'), ref('ownerAuthFilter'))),
    ]),
  ),
  iff(
    and([
      raw('$authGroupRuntimeFilter.size() > 0'),
      raw('$authGroupRuntimeFilter.size() + $authRuntimeFilter.size() <= 10'),
    ]),
    forEach(ref('groupAuthFilter'), ref('authGroupRuntimeFilter'), [
      qref(methodCall(ref('authRuntimeFilter.add'), ref('groupAuthFilter'))),
    ]),
  ),
  iff(
    and([
      not(ref(IS_AUTHORIZED_FLAG)),
      raw('$authRuntimeFilter.size() > 0'),
    ]),
    compoundExpression([
      ifElse(
        methodCall(ref('util.isNullOrEmpty'), ref('ctx.args.filter')),
        set(ref('ctx.args.filter'), raw('{ "or": $authRuntimeFilter }')),
        set(ref('ctx.args.filter'), raw('{ "and": [ { "or": $authRuntimeFilter }, $ctx.args.filter ]}')),
      ),
      set(ref(IS_AUTHORIZED_FLAG), bool(true)),
    ]),
  ),
];

/**
 * Generates auth expressions for each auth type for Subscription requests
 */
export const generateAuthExpressionForSubscriptions = (providers: ConfiguredAuthProviders, roles: Array<RoleDefinition>): string => {
  const {
    cognitoStaticRoles, cognitoDynamicRoles, oidcStaticRoles, oidcDynamicRoles, iamRoles, apiKeyRoles, lambdaRoles,
  } = splitRoles(roles);
  const totalAuthExpressions: Array<Expression> = [setHasAuthExpression, set(ref(IS_AUTHORIZED_FLAG), bool(false))];
  if (providers.hasApiKey) {
    totalAuthExpressions.push(apiKeyExpression(apiKeyRoles));
  }
  if (providers.hasLambda) {
    totalAuthExpressions.push(lambdaExpression(lambdaRoles));
  }
  if (providers.hasIAM) {
    totalAuthExpressions.push(iamExpression(iamRoles, providers.hasAdminRolesEnabled, providers.adminRoles, providers.identityPoolId));
  }
  if (providers.hasUserPools) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(COGNITO_AUTH_TYPE)),
        compoundExpression([...generateStaticRoleExpression(cognitoStaticRoles), ...dynamicRoleExpression(cognitoDynamicRoles)]),
      ),
    );
  }
  if (providers.hasOIDC) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(OIDC_AUTH_TYPE)),
        compoundExpression([...generateStaticRoleExpression(oidcStaticRoles), ...dynamicRoleExpression(oidcDynamicRoles)]),
      ),
    );
  }
  totalAuthExpressions.push(iff(not(ref(IS_AUTHORIZED_FLAG)), ref('util.unauthorized()')));
  return printBlock('Authorization Steps')(compoundExpression([...totalAuthExpressions, emptyPayload]));
};

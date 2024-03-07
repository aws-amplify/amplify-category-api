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
  and,
  ifElse,
  comment,
  list,
  qref,
  raw,
  parens,
  int,
} from 'graphql-mapping-template';
import { COGNITO_AUTH_TYPE, ConfiguredAuthProviders, IS_AUTHORIZED_FLAG, OIDC_AUTH_TYPE, RoleDefinition, splitRoles } from '../../../utils';
import {
  generateStaticRoleExpression,
  apiKeyExpression,
  iamExpression,
  lambdaExpression,
  emptyPayload,
  setHasAuthExpression,
  generateOwnerClaimExpression,
  generateOwnerClaimListExpression,
  generateOwnerMultiClaimExpression,
  generateInvalidClaimsCondition,
  getIdentityClaimExp,
  getOwnerClaimReference,
} from './helpers';

const HAS_VALID_OWNER_ARGUMENT_FLAG = 'hasValidOwnerArgument';
const IS_OWNER_AUTH_AUTHORIZED_AND_NO_OTHER_FILTERS_FLAG = 'isOwnerAuthAuthorizedAndNoOtherFilters';
const IS_OWNER_OR_DYNAMIC_AUTH_AUTHORIZED_WITH_FILTERS_FLAG = 'isOwnerOrDynamicAuthAuthorizedWithFilters';
const FILTER_ARGS_SIZE_FLAG = 'filterArgsSize';

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
        iff(
          generateInvalidClaimsCondition(role.claim!, `ownerClaim${idx}`),
          compoundExpression([
            generateOwnerMultiClaimExpression(role.claim!, `ownerClaim${idx}`),
            generateOwnerClaimListExpression(role.claim!, `ownerClaimsList${idx}`),
            qref(
              methodCall(
                ref('authOwnerRuntimeFilter.add'),
                raw(`{ "${role.entity}": { "${role.isEntityList ? 'contains' : 'eq'}": $${ownerClaimRef} } }`),
              ),
            ),
            set(ref(`ownerEntity${idx}`), methodCall(ref('util.defaultIfNull'), ref(`ctx.args.${role.entity!}`), nul())),
            iff(
              and([not(ref(IS_AUTHORIZED_FLAG)), not(methodCall(ref('util.isNullOrEmpty'), ref(`ownerEntity${idx}`)))]),
              compoundExpression([
                ifElse(
                  or([
                    equals(ref(`ownerEntity${idx}`), ref(`ownerClaim${idx}`)),
                    methodCall(ref(`ownerClaimsList${idx}.contains`), ref(`ownerEntity${idx}`)),
                  ]),
                  compoundExpression([set(ref(IS_AUTHORIZED_FLAG), bool(true)), set(ref(HAS_VALID_OWNER_ARGUMENT_FLAG), bool(true))]),
                  methodCall(ref('util.unauthorized')),
                ),
              ]),
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
        iff(
          not(methodCall(ref('util.isNullOrEmpty'), ref(`groupClaim${idx}`))),
          qref(
            methodCall(
              ref('authGroupRuntimeFilter.add'),
              raw(`{ "${role.entity}": { "${role.isEntityList ? 'containsAny' : 'in'}": $groupClaim${idx} } }`),
            ),
          ),
        ),
      );
    }
  });

  dynamicExpression.push(...combineAuthExpressionAndFilter(ownerExpression, groupExpression));

  return dynamicExpression;
};

const combineAuthExpressionAndFilter = (ownerExpression: Array<Expression>, groupExpression: Array<Expression>): Array<Expression> => [
  set(ref(HAS_VALID_OWNER_ARGUMENT_FLAG), bool(false)),
  set(ref('authRuntimeFilter'), list([])),
  set(ref('authOwnerRuntimeFilter'), list([])),
  set(ref('authGroupRuntimeFilter'), list([])),
  ...(ownerExpression.length > 0 ? ownerExpression : []),
  ...(groupExpression.length > 0 ? groupExpression : []),
  comment('Apply dynamic roles auth if not previously authorized by static groups and owner argument'),
  iff(raw('$authOwnerRuntimeFilter.size() > 0'), qref(methodCall(ref('authRuntimeFilter.addAll'), ref('authOwnerRuntimeFilter')))),
  iff(raw('$authGroupRuntimeFilter.size() > 0'), qref(methodCall(ref('authRuntimeFilter.addAll'), ref('authGroupRuntimeFilter')))),
  set(ref(FILTER_ARGS_SIZE_FLAG), int(0)),
  iff(
    not(methodCall(ref('util.isNullOrEmpty'), ref('ctx.args.filter'))),
    set(ref(FILTER_ARGS_SIZE_FLAG), methodCall(ref('ctx.args.filter.size'))),
  ),
  // isOwnerAuthAuthorizedAndNoOtherFilter is defined as user authorized
  // with an owner param which we've verified matches their token claims,
  // and they have aonly a single rtf filter (e.g. their user) and no
  // additional input filters. In this case we can rely on
  // Subscription basic filtering which is computationally less expensive
  // than Runtime filtering, and faster for the customer.
  set(
    ref(IS_OWNER_AUTH_AUTHORIZED_AND_NO_OTHER_FILTERS_FLAG),
    and([
      ref(HAS_VALID_OWNER_ARGUMENT_FLAG),
      equals(methodCall(ref('authRuntimeFilter.size')), int(1)),
      equals(ref(FILTER_ARGS_SIZE_FLAG), int(0)),
    ]),
  ),
  set(
    ref(IS_OWNER_OR_DYNAMIC_AUTH_AUTHORIZED_WITH_FILTERS_FLAG),
    and([parens(or([not(ref(IS_AUTHORIZED_FLAG)), ref(HAS_VALID_OWNER_ARGUMENT_FLAG)])), raw('$authRuntimeFilter.size() > 0')]),
  ),
  iff(
    and([not(ref(IS_OWNER_AUTH_AUTHORIZED_AND_NO_OTHER_FILTERS_FLAG)), ref(IS_OWNER_OR_DYNAMIC_AUTH_AUTHORIZED_WITH_FILTERS_FLAG)]),
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
  const { cognitoStaticRoles, cognitoDynamicRoles, oidcStaticRoles, oidcDynamicRoles, iamRoles, apiKeyRoles, lambdaRoles } =
    splitRoles(roles);
  const totalAuthExpressions: Array<Expression> = [setHasAuthExpression, set(ref(IS_AUTHORIZED_FLAG), bool(false))];
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

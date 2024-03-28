import {
  iff,
  ref,
  methodCall,
  compoundExpression,
  obj,
  printBlock,
  toJson,
  str,
  not,
  Expression,
  and,
  equals,
  ret,
} from 'graphql-mapping-template';

const API_KEY = 'API Key Authorization';
const IAM_AUTH_TYPE = 'IAM Authorization';
/**
 * Util function to generate post auth expression
 *
 * 1. Pass through if 'ctx.stash.hasAuth' is true (auth directive is present)
 * 2. Pass through for API key auth type if sandbox is enabled.
 * 3. Pass through for IAM auth type if generic IAM access is enabled and principal is not coming from Cognito.
 * 4. Otherwise, rejects as unauthorized.
 *
 * @param isSandboxModeEnabled a flag indicating if sandbox is enabled.
 * @param genericIamAccessEnabled a flag indicating if generic IAM access is enabled.
 * @returns an expression.
 */
export const generatePostAuthExpression = (isSandboxModeEnabled: boolean, genericIamAccessEnabled: boolean | undefined): string => {
  const expressions: Array<Expression> = [];
  if (isSandboxModeEnabled) {
    expressions.push(iff(equals(methodCall(ref('util.authType')), str(API_KEY)), ret(toJson(obj({})))));
  }
  if (genericIamAccessEnabled) {
    const isNonCognitoIAMPrincipal = and([
      equals(ref('util.authType()'), str(IAM_AUTH_TYPE)),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityPoolId')),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityId')),
    ]);
    expressions.push(iff(isNonCognitoIAMPrincipal, ret(toJson(obj({})))));
  }
  expressions.push(methodCall(ref('util.unauthorized')));

  return printBlock(
    `Sandbox Mode ${isSandboxModeEnabled ? 'Enabled' : 'Disabled'}, IAM Access ${genericIamAccessEnabled ? 'Enabled' : 'Disabled'}`,
  )(compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), compoundExpression(expressions)), toJson(obj({}))]));
};

/**
 * Util function to generate resolver key used to keep track of all the resolvers in memory
 * @param typeName Name of the type
 * @param fieldName Name of the field
 */
export const generateResolverKey = (typeName: string, fieldName: string): string => {
  return `${typeName}.${fieldName}`;
};

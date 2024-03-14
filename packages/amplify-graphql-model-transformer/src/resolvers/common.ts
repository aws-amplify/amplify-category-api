import {
  iff,
  ref,
  notEquals,
  methodCall,
  compoundExpression,
  obj,
  printBlock,
  toJson,
  str,
  not,
  Expression,
  and,
  ifElse,
  set,
  bool,
} from 'graphql-mapping-template';

const API_KEY = 'API Key Authorization';
/**
 * Util function to generate sandbox mode expression
 */
export const generateAuthExpressionForSandboxMode = (
  isSandboxModeEnabled: boolean,
  genericIamAccessEnabled: boolean | undefined,
): string => {
  let exp;

  if (isSandboxModeEnabled) exp = iff(notEquals(methodCall(ref('util.authType')), str(API_KEY)), methodCall(ref('util.unauthorized')));
  else exp = methodCall(ref('util.unauthorized'));

  return printBlock(`Sandbox Mode ${isSandboxModeEnabled ? 'Enabled' : 'Disabled'}`)(
    compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), generateIAMAccessCheck(genericIamAccessEnabled, exp)), toJson(obj({}))]),
  );
};

/**
 * Creates an expression that allows generic IAM access for principals not associated to CognitoIdentityPool
 */
const generateIAMAccessCheck = (enableIamAccess: boolean | undefined, expression: Expression): Expression => {
  if (!enableIamAccess) {
    // No-op if generic IAM access is not enabled.
    return expression;
  }

  const isGenericIamAccess = and([
    methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityPoolId')),
    methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityId')),
  ]);
  return iff(not(isGenericIamAccess), expression);
};

/**
 * Util function to generate resolver key used to keep track of all the resolvers in memory
 * @param typeName Name of the type
 * @param fieldName Name of the field
 */
export const generateResolverKey = (typeName: string, fieldName: string): string => {
  return `${typeName}.${fieldName}`;
};

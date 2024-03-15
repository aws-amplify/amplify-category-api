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
  equals,
  parens,
} from 'graphql-mapping-template';

const API_KEY = 'API Key Authorization';
const IAM_AUTH_TYPE = 'IAM Authorization';
/**
 * Util function to generate sandbox mode expression
 */
export const generateAuthExpressionForSandboxMode = (
  isSandboxModeEnabled: boolean,
  genericIamAccessEnabled: boolean | undefined,
): string => {
  let exp: Expression = methodCall(ref('util.unauthorized'));

  if (isSandboxModeEnabled) {
    exp = iff(notEquals(methodCall(ref('util.authType')), str(API_KEY)), exp);
  }

  if (genericIamAccessEnabled) {
    const isNonCognitoIAMPrincipal = and([
      equals(ref('util.authType()'), str(IAM_AUTH_TYPE)),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityPoolId')),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityId')),
    ]);
    exp = iff(not(parens(isNonCognitoIAMPrincipal)), exp);
  }

  return printBlock(`Sandbox Mode ${isSandboxModeEnabled ? 'Enabled' : 'Disabled'}`)(
    compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), exp), toJson(obj({}))]),
  );
};

/**
 * Util function to generate resolver key used to keep track of all the resolvers in memory
 * @param typeName Name of the type
 * @param fieldName Name of the field
 */
export const generateResolverKey = (typeName: string, fieldName: string): string => {
  return `${typeName}.${fieldName}`;
};

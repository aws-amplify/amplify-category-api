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
 * Util function to generate sandbox mode expression
 */
export const generateAuthExpressionForSandboxMode = (
  isSandboxModeEnabled: boolean,
  genericIamAccessEnabled: boolean | undefined,
): string => {
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

  return printBlock(`Sandbox Mode ${isSandboxModeEnabled ? 'Enabled' : 'Disabled'}`)(
    compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), compoundExpression(expressions)), toJson(obj({}))]),
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

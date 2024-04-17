import { and, bool, equals, Expression, methodCall, qref, ref, str } from 'graphql-mapping-template';
import { IAM_AUTH_TYPE } from '../utils';

// note in the resolver that operation is protected by auth
export const setHasAuthExpression: Expression = qref(methodCall(ref('ctx.stash.put'), str('hasAuth'), bool(true)));

// a logical condition which returns true if request is made with non-Cognito IAM principal
export const isNonCognitoIAMPrincipal = and([
  equals(ref('util.authType()'), str(IAM_AUTH_TYPE)),
  methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityPoolId')),
  methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityId')),
]);

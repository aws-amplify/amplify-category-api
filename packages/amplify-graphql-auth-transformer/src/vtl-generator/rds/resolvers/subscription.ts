import { and, compoundExpression, ifElse, iff, list, methodCall, not, obj, printBlock, ref, set } from 'graphql-mapping-template';
import { ConfiguredAuthProviders, RoleDefinition } from '../../../utils';
import { emptyPayload, generateAuthRulesFromRoles, generateIAMAccessCheck, validateAuthResult } from './common';

export const generateAuthExpressionForSubscriptions = (providers: ConfiguredAuthProviders, roles: Array<RoleDefinition>): string => {
  const expressions = [];
  expressions.push(compoundExpression(generateAuthRulesFromRoles(roles, [], providers.hasIdentityPoolId, true)));
  expressions.push(set(ref('authResult'), methodCall(ref('util.authRules.subscriptionAuth'), ref('authRules'))));
  expressions.push(validateAuthResult());

  // Construct auth filter to set it as runtime filter
  expressions.push(
    iff(
      and([ref('authResult'), not(methodCall(ref('util.isNullOrEmpty'), ref('authResult.authFilter')))]),
      ifElse(
        methodCall(ref('util.isNullOrEmpty'), ref('ctx.args.filter')),
        set(ref('ctx.args.filter'), ref('authResult.authFilter')),
        set(
          ref('ctx.args.filter'),
          obj({
            and: list([ref('authResult.authFilter'), ref('ctx.args.filter')]),
          }),
        ),
      ),
    ),
  );

  expressions.push(emptyPayload);

  return printBlock('Authorization rules')(generateIAMAccessCheck(providers.genericIamAccessEnabled, compoundExpression(expressions)));
};

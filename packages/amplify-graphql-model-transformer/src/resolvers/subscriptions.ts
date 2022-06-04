import {
  compoundExpression, Expression, obj, printBlock, str, toJson, nul, iff, not, isNullOrEmpty, ref,
} from 'graphql-mapping-template';

/**
 * Generates subscription request template
 */
export const generateSubscriptionRequestTemplate = (): string => {
  const statements: Expression[] = [toJson(obj({ version: str('2018-05-29'), payload: obj({}) }))];
  return printBlock('Subscription Request template')(compoundExpression(statements));
};

/**
 * Generates subscription response template
 */
export const generateSubscriptionResponseTemplate = (): string => {
  const statements: Expression[] = [
    iff(
      not(isNullOrEmpty(ref('ctx.args.filter'))),
      ref('extensions.setSubscriptionFilter($util.transform.toSubscriptionFilter($ctx.args.filter))'),
    ),
    toJson(nul()),
  ];
  return printBlock('Subscription Response template')(compoundExpression(statements));
};

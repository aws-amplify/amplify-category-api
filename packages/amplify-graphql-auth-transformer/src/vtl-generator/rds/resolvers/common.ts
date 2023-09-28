import { compoundExpression, methodCall, obj, printBlock, ref, toJson } from 'graphql-mapping-template';

/**
 * Generates default RDS expression
 */
export const generateDefaultRDSExpression = (): string => {
  const exp = methodCall(ref('util.unauthorized'));
  return printBlock('Default RDS Auth Resolver')(compoundExpression([exp, toJson(obj({}))]));
};

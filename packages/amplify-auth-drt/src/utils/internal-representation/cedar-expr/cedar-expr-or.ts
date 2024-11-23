/* eslint-disable import/no-cycle */
import { JsonExpr, JsonExprOr } from '../json-expr';
import { CedarExpr } from './cedar-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';
import { cedarExprToJsonExpr } from './cedar-ir';
import { isCedarBinaryOperatorWithKey } from './cedar-type-utils';

export interface CedarExprOr {
  '||': {
    left: CedarExpr;
    right: CedarExpr;
  };
}

export const isCedarExprOr = (obj: any): obj is CedarExprOr => {
  return isCedarBinaryOperatorWithKey(obj, '||');
};

export const cedarExprOrToJsonExpr = (cedarExpr: CedarExprOr, valueMap: CedarConcreteValueMap | undefined = undefined): JsonExprOr => {
  const result = traverseOrTree(cedarExpr, valueMap);

  return {
    or: result,
  };
};

/**
 * Returns an array of values from a Cedar 'or' tree, so they can be flattened into a top-level array
 */
const traverseOrTree = (cedarExpr: CedarExprOr, valueMap: CedarConcreteValueMap | undefined): JsonExpr[] => {
  const result: JsonExpr[] = [];
  const left = cedarExpr['||'].left;
  const right = cedarExpr['||'].right;

  if (isCedarExprOr(left)) {
    result.push(...traverseOrTree(left, valueMap));
  } else {
    result.push(cedarExprToJsonExpr(left, valueMap));
  }

  if (isCedarExprOr(right)) {
    result.push(...traverseOrTree(right, valueMap));
  } else {
    result.push(cedarExprToJsonExpr(right, valueMap));
  }

  return result;
};

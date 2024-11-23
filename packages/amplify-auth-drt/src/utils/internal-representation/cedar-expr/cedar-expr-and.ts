/* eslint-disable import/no-cycle */
import { JsonExpr, JsonExprAnd } from '../json-expr';
import { CedarExpr } from './cedar-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';
import { cedarExprToJsonExpr } from './cedar-ir';
import { isCedarBinaryOperatorWithKey } from './cedar-type-utils';

export interface CedarExprAnd {
  '&&': {
    left: CedarExpr;
    right: CedarExpr;
  };
}

export const isCedarExprAnd = (obj: any): obj is CedarExprAnd => {
  return isCedarBinaryOperatorWithKey(obj, '&&');
};

export const cedarExprAndToJsonExpr = (cedarExpr: CedarExprAnd, valueMap: CedarConcreteValueMap | undefined = undefined): JsonExprAnd => {
  const result = traverseAndTree(cedarExpr, valueMap);

  return {
    and: result,
  };
};

/**
 * Returns an array of values from a Cedar 'and' tree, so they can be flattened into a top-level array
 */
const traverseAndTree = (cedarExpr: CedarExprAnd, valueMap: CedarConcreteValueMap | undefined): JsonExpr[] => {
  const result: JsonExpr[] = [];
  const left = cedarExpr['&&'].left;
  const right = cedarExpr['&&'].right;

  if (isCedarExprAnd(left)) {
    result.push(...traverseAndTree(left, valueMap));
  } else {
    result.push(cedarExprToJsonExpr(left, valueMap));
  }

  if (isCedarExprAnd(right)) {
    result.push(...traverseAndTree(right, valueMap));
  } else {
    result.push(cedarExprToJsonExpr(right, valueMap));
  }

  return result;
};

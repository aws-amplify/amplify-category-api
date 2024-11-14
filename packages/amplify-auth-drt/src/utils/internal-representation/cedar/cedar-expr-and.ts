/* eslint-disable import/no-cycle */
import { JsonExpr } from '../internal-representation';
import { CedarExpr } from './cedar-expr';
import { cedarExprToJsonExpr } from './cedar-ir';
import { isCedarBinaryOperatorWithKey } from './cedar-type-utils';

export interface CedarExprAnd extends CedarExpr {
  '&&': {
    left: CedarExpr;
    right: CedarExpr;
  };
}

export const isCedarExprAnd = (obj: any): obj is CedarExprAnd => {
  return isCedarBinaryOperatorWithKey(obj, '&&');
};

export const cedarExprAndToJsonExpr = (cedarExpr: CedarExprAnd): JsonExpr => {
  return {
    and: {
      left: cedarExprToJsonExpr(cedarExpr['&&'].left),
      right: cedarExprToJsonExpr(cedarExpr['&&'].right),
    },
  };
};

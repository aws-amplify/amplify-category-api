/* eslint-disable import/no-cycle */
import { JsonExpr } from '../internal-representation';
import { CedarExpr } from './cedar-expr';
import { cedarExprToJsonExpr } from './cedar-ir';
import { isCedarBinaryOperatorWithKey } from './cedar-type-utils';

export interface CedarExprOr extends CedarExpr {
  '||': {
    left: CedarExpr;
    right: CedarExpr;
  };
}

export const isCedarExprOr = (obj: any): obj is CedarExprOr => {
  return isCedarBinaryOperatorWithKey(obj, '||');
};

export const cedarExprOrToJsonExpr = (cedarExpr: CedarExprOr): JsonExpr => {
  return {
    or: {
      left: cedarExprToJsonExpr(cedarExpr['||'].left),
      right: cedarExprToJsonExpr(cedarExpr['||'].right),
    },
  };
};

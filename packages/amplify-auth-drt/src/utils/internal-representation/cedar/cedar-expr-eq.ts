/* eslint-disable import/no-cycle */
import { JsonExpr } from '../internal-representation';
import { CedarExpr } from './cedar-expr';
import { cedarExprToJsonExpr } from './cedar-ir';
import { isCedarBinaryOperatorWithKey } from './cedar-type-utils';

export interface CedarExprEq extends CedarExpr {
  '==': {
    left: CedarExpr;
    right: CedarExpr;
  };
}

export const isCedarExprEq = (obj: any): obj is CedarExprEq => {
  return isCedarBinaryOperatorWithKey(obj, '==');
};

export const cedarExprEqToJsonExpr = (cedarExpr: CedarExprEq): JsonExpr => {
  return {
    eq: {
      left: cedarExprToJsonExpr(cedarExpr['=='].left),
      right: cedarExprToJsonExpr(cedarExpr['=='].right),
    },
  };
};

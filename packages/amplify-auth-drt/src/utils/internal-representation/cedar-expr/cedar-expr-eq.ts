/* eslint-disable import/no-cycle */
import { JsonExprEq } from '../json-expr';
import { CedarExpr } from './cedar-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';
import { cedarExprToJsonExpr } from './cedar-ir';
import { isCedarBinaryOperatorWithKey } from './cedar-type-utils';

export interface CedarExprEq {
  '==': {
    left: CedarExpr;
    right: CedarExpr;
  };
}

export const isCedarExprEq = (obj: any): obj is CedarExprEq => {
  return isCedarBinaryOperatorWithKey(obj, '==');
};

export const cedarExprEqToJsonExpr = (cedarExpr: CedarExprEq, valueMap: CedarConcreteValueMap | undefined = undefined): JsonExprEq => {
  return {
    eq: {
      left: cedarExprToJsonExpr(cedarExpr['=='].left, valueMap),
      right: cedarExprToJsonExpr(cedarExpr['=='].right, valueMap),
    },
  };
};

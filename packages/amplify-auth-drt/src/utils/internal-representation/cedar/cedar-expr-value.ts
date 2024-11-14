/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../internal-representation';
import { CedarExprLiteral, isCedarExprLiteral } from './cedar-expr-literal';
import { CedarExpr } from './cedar-expr';

export interface CedarExprValue extends CedarExpr {
  Value: CedarExprLiteral;
}

export const isCedarExprValue = (obj: any): obj is CedarExprValue => {
  return obj && hasKey(obj, 'Value') && isCedarExprLiteral(obj.Value);
};

export const cedarExprValueToJsonExpr = (cedarExpr: CedarExprValue): JsonExpr => {
  return { value: cedarExpr.Value };
};

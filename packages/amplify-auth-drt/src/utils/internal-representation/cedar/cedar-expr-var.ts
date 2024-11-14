/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../internal-representation';
import { CedarExpr } from './cedar-expr';

export type CedarExprVarAllowedValue = 'principal' | 'action' | 'resource' | 'context';

export interface CedarExprVar extends CedarExpr {
  Var: CedarExprVarAllowedValue;
}

export const isCedarExprVar = (obj: any): obj is CedarExprVar => {
  const allowedValues = ['principal', 'action', 'resource', 'context'];
  return obj && hasKey(obj, 'Var') && typeof obj.Var === 'string' && allowedValues.includes(obj.Var);
};

export const cedarExprVarToJsonExpr = (cedarExpr: CedarExprVar): JsonExpr => {
  return cedarExpr.Var;
};

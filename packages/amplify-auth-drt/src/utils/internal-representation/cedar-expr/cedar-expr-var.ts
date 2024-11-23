/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExprVar } from '../json-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';

export type CedarExprVarAllowedValue = 'principal' | 'action' | 'resource' | 'context';

export interface CedarExprVar {
  Var: CedarExprVarAllowedValue;
}

export const isCedarExprVar = (obj: any): obj is CedarExprVar => {
  const allowedValues = ['principal', 'action', 'resource', 'context'];
  return obj && hasKey(obj, 'Var') && typeof obj.Var === 'string' && allowedValues.includes(obj.Var);
};

export const cedarExprVarToJsonExpr = (cedarExpr: CedarExprVar, _: CedarConcreteValueMap | undefined = undefined): JsonExprVar => {
  return { var: cedarExpr.Var };
};

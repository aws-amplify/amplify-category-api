/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../internal-representation';
import { CedarExpr } from './cedar-expr';
import { isCedarExprValue } from './cedar-expr-value';

export interface CedarExprUnknown extends CedarExpr {
  unknown: [{ Value: string }];
}

export const isCedarExprUnknown = (obj: any): obj is CedarExprUnknown => {
  return (
    obj &&
    hasKey(obj, 'unknown') &&
    Array.isArray(obj['unknown']) &&
    obj['unknown'].length > 0 &&
    isCedarExprValue(obj['unknown'][0]) &&
    typeof obj['unknown'][0].Value === 'string'
  );
};

export const cedarExprUnknownToJsonExpr = (cedarExpr: CedarExprUnknown): JsonExpr => {
  return { unknown: cedarExpr.unknown[0].Value };
};

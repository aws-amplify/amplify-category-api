/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from './json-expr';

export interface JsonExprEq {
  eq: {
    left: JsonExpr;
    right: JsonExpr;
  };
}

export const isJsonExprEq = (obj: any): obj is JsonExprEq => {
  return hasKey(obj, 'eq') && typeof obj.eq.left === 'object' && typeof obj.eq.right === 'object';
};

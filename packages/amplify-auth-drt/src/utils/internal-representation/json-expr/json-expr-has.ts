/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from './json-expr';

export interface JsonExprHas {
  has: {
    left: JsonExpr;
    attr: string;
  };
}

export const isJsonExprHas = (obj: any): obj is JsonExprHas => {
  return hasKey(obj, 'has') && typeof obj.eq.left === 'object' && typeof obj.eq.attr === 'string';
};

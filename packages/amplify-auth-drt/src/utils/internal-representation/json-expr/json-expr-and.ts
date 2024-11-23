/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from './json-expr';

export interface JsonExprAnd {
  and: JsonExpr[];
}

export const isJsonExprAnd = (obj: any): obj is JsonExprAnd => {
  return hasKey(obj, 'and') && Array.isArray(obj['and']);
};

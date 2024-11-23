/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from './json-expr';

export interface JsonExprOr {
  or: JsonExpr[];
}

export const isJsonExprOr = (obj: any): obj is JsonExprOr => {
  return hasKey(obj, 'or') && Array.isArray(obj['or']);
};

/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from './json-expr';

export interface JsonExprRecord {
  record: Record<string, JsonExpr>;
}

export const isJsonExprRecord = (obj: any): obj is JsonExprRecord => {
  return hasKey(obj, 'record') && typeof obj['record'] === 'object';
};

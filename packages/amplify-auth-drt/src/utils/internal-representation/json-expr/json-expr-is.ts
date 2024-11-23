/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from './json-expr';

export interface JsonExprIs {
  is: {
    left: JsonExpr;
    entityType: string;
    in?: JsonExpr;
  };
}

export const isJsonExprIs = (obj: any): obj is JsonExprIs => {
  return hasKey(obj, 'is') && typeof obj.is.left === 'object' && typeof obj.is.entity_type === 'string';
};

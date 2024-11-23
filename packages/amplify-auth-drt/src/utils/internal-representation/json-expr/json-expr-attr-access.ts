/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from './json-expr';

export interface JsonExprAttrAccess {
  attr: {
    left: JsonExpr;
    attr: string;
  };
}

export const isJsonExprAttrAccess = (obj: any): obj is JsonExprAttrAccess => {
  return hasKey(obj, 'attr') && typeof (obj as any)['attr']['attr'] === 'string' && typeof (obj as any)['attr']['left'] !== 'undefined';
};

/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';

export interface JsonExprEntity {
  __entity: JsonExprEntityValue;
}

export interface JsonExprEntityValue {
  type: string;
  id: string;
}

export const isJsonExprEntity = (obj: any): obj is JsonExprEntity => {
  return hasKey(obj, '__entity') && isJsonExprEntityValue(obj['__entity']);
};

export const isJsonExprEntityValue = (obj: any): obj is JsonExprEntityValue => {
  return hasKey(obj, 'type') && hasKey(obj, 'id') && typeof obj.type === 'string' && typeof obj.id === 'string';
};

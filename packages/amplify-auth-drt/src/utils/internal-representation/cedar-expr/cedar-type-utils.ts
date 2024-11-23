import { hasKey } from '../../type-utils';

export const isCedarBinaryOperatorWithKey = <T extends object, K extends string>(
  obj: T,
  key: K,
): obj is T & Record<K, { left: any; right: any }> => {
  return hasKey(obj, key) && typeof (obj as any)[key]['left'] !== 'undefined' && typeof (obj as any)[key]['right'] !== 'undefined';
};

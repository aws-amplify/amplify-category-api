import { hasKey } from '../../type-utils';

export interface JsonExprUnknown {
  unknown: string;
}

export const isJsonExprUnknown = (obj: any): obj is JsonExprUnknown => {
  return hasKey(obj, 'unknown') && typeof obj.unknown === 'string';
};

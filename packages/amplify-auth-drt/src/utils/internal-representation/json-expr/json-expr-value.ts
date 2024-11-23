import { hasKey } from '../../type-utils';
import { isJsonExprEntity, JsonExprEntity } from './json-expr-entity';
import { isJsonExprLiteral, JsonExprLiteral } from './json-expr-literal';

export interface JsonExprValue {
  value: JsonExprLiteral | JsonExprEntity;
}

export const isJsonExprValue = (obj: any): obj is JsonExprValue => {
  return obj && hasKey(obj, 'value') && (isJsonExprLiteral(obj.value) || isJsonExprEntity(obj.value));
};

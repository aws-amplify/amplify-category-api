import { hasKey } from '../../type-utils';
import { JsonExprLiteral } from './json-expr-literal';

export interface JsonExprVar {
  var: JsonExprLiteral;
}

export type JsonExprVarAllowedValue = 'principal' | 'action' | 'resource' | 'context';

export const isJsonExprVar = (obj: any): obj is JsonExprVar => {
  const allowedValues = ['principal', 'action', 'resource', 'context'];
  return obj && hasKey(obj, 'Var') && typeof obj.Var === 'string' && allowedValues.includes(obj.Var);
};

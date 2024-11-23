/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExprValue } from '../json-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';
import { CedarExprEntity, cedarExprEntityToJsonExpr, isCedarExprEntity } from './cedar-expr-entity';
import { CedarExprLiteral, cedarExprLiteralToJsonExpr, isCedarExprLiteral } from './cedar-expr-literal';

export interface CedarExprValue {
  Value: CedarExprLiteral | CedarExprEntity;
}

export const isCedarExprValue = (obj: any): obj is CedarExprValue => {
  return obj && hasKey(obj, 'Value') && (isCedarExprLiteral(obj.Value) || isCedarExprEntity(obj.Value));
};

export const cedarExprValueToJsonExpr = (
  cedarExpr: CedarExprValue,
  valueMap: CedarConcreteValueMap | undefined = undefined,
): JsonExprValue => {
  const value = isCedarExprLiteral(cedarExpr.Value)
    ? cedarExprLiteralToJsonExpr(cedarExpr.Value, valueMap)
    : cedarExprEntityToJsonExpr(cedarExpr.Value, valueMap);
  return { value };
};

/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr, JsonExprAttrAccess } from '../json-expr';
import { CedarExpr } from './cedar-expr';
import { isCedarExprVar } from './cedar-expr-var';
import { cedarExprToJsonExpr } from './cedar-ir';

/**
 * The CedarExpr representing attribute access via the `.` operator.
 */

export interface CedarExprAttrAccess {
  '.': {
    left: CedarExpr;
    attr: string;
  };
}

/**
 * A map of concrete values to substitute when converting a CedarExprAttrAccess to a JsonExpr
 */
export interface CedarConcreteValueMap {
  principal?: Record<string, CedarExpr>;
  action?: Record<string, CedarExpr>;
  resource?: Record<string, CedarExpr>;
  context?: Record<string, CedarExpr>;
}

export const isCedarExprAttrAccess = (obj: any): obj is CedarExprAttrAccess => {
  return hasKey(obj, '.') && typeof (obj as any)['.']['attr'] === 'string' && typeof (obj as any)['.']['left'] !== 'undefined';
};

/**
 * Converts the CedarExprAttrAccess to a JsonExpr. If `valueMap` is provided, and the attribute being accessed is a `CedarExprVar` whose key
 * is present in the map, the returned JsonExpr will be the value derived by converting `valueMap[Var][attr]` to a JsonExpr. Otherwise, it
 * will be a JsonExprAttrAccess, representing an as-yet-unknown value.
 */
export const cedarExprAttrAccessToJsonExpr = (
  cedarExpr: CedarExprAttrAccess,
  valueMap: CedarConcreteValueMap | undefined = undefined,
): JsonExpr => {
  const left = cedarExpr['.'].left;
  const attr = cedarExpr['.'].attr;

  const defaultReturnValue = (): JsonExprAttrAccess => ({ attr: { left: cedarExprToJsonExpr(left, valueMap), attr } });

  if (!valueMap) {
    return defaultReturnValue();
  }

  if (!isCedarExprVar(left)) {
    return defaultReturnValue();
  }

  const concreteValue = valueMap[left.Var]?.[attr];

  if (typeof concreteValue === 'undefined') {
    return defaultReturnValue();
  }

  return cedarExprToJsonExpr(concreteValue, valueMap);
};

/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../internal-representation';
import { CedarExpr } from './cedar-expr';
import { cedarExprToJsonExpr } from './cedar-ir';

/**
 * The CedarExpr representing attribute access via the `.` operator.
 */

export interface CedarExprHas extends CedarExpr {
  has: {
    left: CedarExpr;
    attr: string;
  };
}

export const isCedarExprHas = (obj: any): obj is CedarExprHas => {
  return hasKey(obj, 'has') && typeof (obj as any)['has']['attr'] === 'string' && typeof (obj as any)['has']['left'] !== 'undefined';
};

export const cedarExprHasToJsonExpr = (cedarExpr: CedarExprHas): JsonExpr => {
  const left = cedarExprToJsonExpr(cedarExpr['has'].left);
  const attr = cedarExpr['has'].attr;
  return { has: { left, attr } };
};

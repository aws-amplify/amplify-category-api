/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../internal-representation';
import { CedarExpr } from './cedar-expr';
import { cedarExprToJsonExpr } from './cedar-ir';

/**
 * The CedarExpr representing attribute access via the `.` operator.
 */

export interface CedarExprAttrAccess extends CedarExpr {
  '.': {
    left: CedarExpr;
    attr: string;
  };
}

export const isCedarExprAttrAccess = (obj: any): obj is CedarExprAttrAccess => {
  return hasKey(obj, '.') && typeof (obj as any)['.']['attr'] === 'string' && typeof (obj as any)['.']['left'] !== 'undefined';
};

/**
 * Collapses the expression tree to form a single string.
 *
 * Example:
 * ```json
 * const o = {
 *   left: {
 *     '.': {
 *       left: {
 *         Var: 'context',
 *       },
 *       attr: 'result',
 *     },
 *   },
 *   attr: 'owner',
 * }
 *
 * cedarExprAttrAccessToJsonExpr(o) === 'context.result.owner'
 * ```
 */
export const cedarExprAttrAccessToJsonExpr = (cedarExpr: CedarExprAttrAccess): JsonExpr => {
  const left = cedarExprToJsonExpr(cedarExpr['.'].left);
  const attr = cedarExpr['.'].attr;
  return { attr: { left, attr } };
};

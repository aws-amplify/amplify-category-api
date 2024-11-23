/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExprHas } from '../json-expr';
import { CedarExpr } from './cedar-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';
import { cedarExprToJsonExpr } from './cedar-ir';

/**
 * The CedarExpr representing attribute access via the `.` operator.
 */

export interface CedarExprHas {
  has: {
    left: CedarExpr;
    attr: string;
  };
}

export const isCedarExprHas = (obj: any): obj is CedarExprHas => {
  return hasKey(obj, 'has') && typeof (obj as any)['has']['attr'] === 'string' && typeof (obj as any)['has']['left'] !== 'undefined';
};

export const cedarExprHasToJsonExpr = (cedarExpr: CedarExprHas, valueMap: CedarConcreteValueMap | undefined = undefined): JsonExprHas => {
  const left = cedarExprToJsonExpr(cedarExpr['has'].left, valueMap);
  const attr = cedarExpr['has'].attr;
  return { has: { left, attr } };
};

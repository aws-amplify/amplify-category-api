/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExprIs } from '../json-expr';
import { CedarExpr } from './cedar-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';
import { cedarExprToJsonExpr } from './cedar-ir';

/**
 * The CedarExpr representing attribute access via the `.` operator.
 */

export interface CedarExprIs {
  is: {
    left: CedarExpr;
    entity_type: string;
    in?: CedarExpr;
  };
}

export const isCedarExprIs = (obj: any): obj is CedarExprIs => {
  return hasKey(obj, 'is') && typeof obj.is.left === 'object' && typeof obj.is.entity_type === 'string';
};

export const cedarExprIsToJsonExpr = (cedarExpr: CedarExprIs, valueMap: CedarConcreteValueMap | undefined = undefined): JsonExprIs => {
  const left = cedarExprToJsonExpr(cedarExpr.is.left, valueMap);
  const entityType = cedarExpr.is.entity_type;
  const returnValue: JsonExprIs = { is: { left, entityType } };
  if (typeof cedarExpr.is.in !== 'undefined') {
    returnValue.is.in = cedarExprToJsonExpr(cedarExpr.is.in, valueMap);
  }
  return returnValue;
};

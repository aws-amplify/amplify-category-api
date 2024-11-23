/* eslint-disable import/no-cycle */
import { JsonExpr } from '../json-expr';
import { CedarExpr } from './cedar-expr';
import { isCedarExprAnd, cedarExprAndToJsonExpr } from './cedar-expr-and';
import { isCedarExprAttrAccess, cedarExprAttrAccessToJsonExpr, CedarConcreteValueMap } from './cedar-expr-attr-access';
import { cedarExprEntityToJsonExpr, isCedarExprEntity } from './cedar-expr-entity';
import { isCedarExprEq, cedarExprEqToJsonExpr } from './cedar-expr-eq';
import { cedarExprHasToJsonExpr, isCedarExprHas } from './cedar-expr-has';
import { isCedarExprIs, cedarExprIsToJsonExpr } from './cedar-expr-is';
import { isCedarExprLiteral, cedarExprLiteralToJsonExpr } from './cedar-expr-literal';
import { isCedarExprOr, cedarExprOrToJsonExpr } from './cedar-expr-or';
import { isCedarExprRecord, cedarExprRecordToJsonExpr } from './cedar-expr-record';
import { cedarExprUnknownToJsonExpr, isCedarExprUnknown } from './cedar-expr-unknown';
import { isCedarExprValue, cedarExprValueToJsonExpr } from './cedar-expr-value';
import { cedarExprVarToJsonExpr, isCedarExprVar } from './cedar-expr-var';

export interface CedarPartialEvaluation {
  decision: string | null | undefined;
  residuals?: [CedarResidual];
}

export interface CedarAnnotation {
  id: string;
}

export interface CedarResidual {
  effect: 'permit' | 'deny';
  principal?: { op: 'All' };
  action?: { op: 'All' };
  resource?: { op: 'All' };
  conditions: [CedarCondition];
  annotations?: CedarAnnotation;
}

export interface CedarCondition {
  kind: 'when' | 'unless';
  body: CedarExpr;
}

/**
 * Converts a CedarExpr to a JsonExpr
 *
 * NOTE: This implementation is brittle, as it relies on manually updating the inspection block with new types. At some point, it's also
 * going to trigger complaints about cyclomatic complexity since the body of this method is a big if/elseif block.
 */

export const cedarExprToJsonExpr = (cedarExpr: CedarExpr, valueMap: CedarConcreteValueMap | undefined = undefined): JsonExpr => {
  if (isCedarExprAnd(cedarExpr)) {
    return cedarExprAndToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprAttrAccess(cedarExpr)) {
    return cedarExprAttrAccessToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprEntity(cedarExpr)) {
    return cedarExprEntityToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprEq(cedarExpr)) {
    return cedarExprEqToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprIs(cedarExpr)) {
    return cedarExprIsToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprHas(cedarExpr)) {
    return cedarExprHasToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprLiteral(cedarExpr)) {
    return cedarExprLiteralToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprUnknown(cedarExpr)) {
    return cedarExprUnknownToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprValue(cedarExpr)) {
    return cedarExprValueToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprVar(cedarExpr)) {
    return cedarExprVarToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprOr(cedarExpr)) {
    return cedarExprOrToJsonExpr(cedarExpr, valueMap);
  } else if (isCedarExprRecord(cedarExpr)) {
    // Make sure this is the last valid check, or else you'll catch other object shapes
    return cedarExprRecordToJsonExpr(cedarExpr, valueMap);
  } else {
    throw new Error(`Unsupported expression type '${JSON.stringify(cedarExpr)}'`);
  }
};

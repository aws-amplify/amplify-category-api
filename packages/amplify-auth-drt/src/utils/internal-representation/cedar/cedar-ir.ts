/* eslint-disable import/no-cycle */
import { Decision, InternalRepresentation, JsonExpr, Residual } from '../internal-representation';
import { CedarExpr } from './cedar-expr';
import { isCedarExprAnd, cedarExprAndToJsonExpr } from './cedar-expr-and';
import { isCedarExprAttrAccess, cedarExprAttrAccessToJsonExpr } from './cedar-expr-attr-access';
import { isCedarExprEq, cedarExprEqToJsonExpr } from './cedar-expr-eq';
import { cedarExprHasToJsonExpr, isCedarExprHas } from './cedar-expr-has';
import { isCedarExprLiteral, cedarExprLiteralToJsonExpr } from './cedar-expr-literal';
import { isCedarExprOr, cedarExprOrToJsonExpr } from './cedar-expr-or';
import { isCedarExprRecord, cedarExprRecordToJsonExpr } from './cedar-expr-record';
import { cedarExprUnknownToJsonExpr, isCedarExprUnknown } from './cedar-expr-unknown';
import { isCedarExprValue, cedarExprValueToJsonExpr } from './cedar-expr-value';
import { cedarExprVarToJsonExpr, isCedarExprVar } from './cedar-expr-var';

export interface CedarPartialEvaluation {
  decision: string | null | undefined;
  residuals?: [CedarResidual];
  annotations?: [CedarAnnotation];
}

export interface CedarAnnotation {
  id: string;
}

export interface CedarResidual {
  effect: 'permit' | 'deny';
  conditions: [CedarCondition];
}

export interface CedarCondition {
  kind: 'when' | 'unless';
  body: CedarExpr;
}

/**
 * For purposes of the POC, we're going to constrain the logic with a number of assumptions that allow us to ignore some fields:
 * - effect: permit
 * - principal: {op: 'All'}
 * - action: {op: 'All'}
 * - resource: {op: 'All'}
 * - conditions.kind: 'when'
 *
 */
export const irFromCedarPartialEvaluation = (pe: CedarPartialEvaluation): InternalRepresentation => {
  const decision = normalizeDecision(pe.decision);

  // Early return if we have a concrete decision
  switch (decision) {
    case Decision.ALLOW:
      return { decision: Decision.ALLOW };
    case Decision.DENY:
      return { decision: Decision.DENY };
    default: {
      // Proceed with rest of evaluation
    }
  }

  const incomingResiduals = pe.residuals ?? [];

  const residuals = incomingResiduals.map(cedarResidualToIrResidual);

  return {
    decision,
    residuals,
  };
};

const normalizeDecision = (decisionString: string | undefined | null): Decision => {
  switch (decisionString ? decisionString.toLowerCase() : 'none') {
    case 'allow':
      return Decision.ALLOW;
    case 'deny':
      return Decision.DENY;
    default:
      return Decision.NONE;
  }
};

const cedarResidualToIrResidual = (cedarResidual: CedarResidual): Residual => {
  const cedarConditions: CedarCondition[] = cedarResidual.conditions && cedarResidual.conditions.length > 0 ? cedarResidual.conditions : [];
  const conditions: JsonExpr[] = cedarConditions.map((c) => c.body).map(cedarExprToJsonExpr);
  return { conditions };
};

/**
 * Converts a CedarExpr to a JsonExpr
 *
 * NOTE: This implementation is brittle, as it relies on manually updating the inspection block with new types. At some point, it's also
 * going to trigger complaints about cyclomatic complexity since the body of this method is a big if/elseif block.
 */

export const cedarExprToJsonExpr = (cedarExpr: CedarExpr): JsonExpr => {
  if (isCedarExprAnd(cedarExpr)) {
    return cedarExprAndToJsonExpr(cedarExpr);

  } else if (isCedarExprAttrAccess(cedarExpr)) {
    return cedarExprAttrAccessToJsonExpr(cedarExpr);

  } else if (isCedarExprEq(cedarExpr)) {
    return cedarExprEqToJsonExpr(cedarExpr);

  } else if (isCedarExprHas(cedarExpr)) {
    return cedarExprHasToJsonExpr(cedarExpr);

  } else if (isCedarExprLiteral(cedarExpr)) {
    return cedarExprLiteralToJsonExpr(cedarExpr);

  } else if (isCedarExprUnknown(cedarExpr)) {
    return cedarExprUnknownToJsonExpr(cedarExpr);

  } else if (isCedarExprValue(cedarExpr)) {
    return cedarExprValueToJsonExpr(cedarExpr);

  } else if (isCedarExprVar(cedarExpr)) {
    return cedarExprVarToJsonExpr(cedarExpr);

  } else if (isCedarExprOr(cedarExpr)) {
    return cedarExprOrToJsonExpr(cedarExpr);

  } else if (isCedarExprRecord(cedarExpr)) {
    // Make sure this is the last valid check, or else you'll catch other object shapes
    return cedarExprRecordToJsonExpr(cedarExpr);
  } else {
    throw new Error(`Unsupported expression type '${JSON.stringify(cedarExpr)}'`);
  }
};

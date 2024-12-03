import { CedarExpr } from '../internal-representation/cedar-expr/cedar-expr';

export interface CedarCondition {
  kind: 'when' | 'unless';
  body: CedarExpr;
}

import { JsonExpr } from '../internal-representation';
import { CedarExpr } from './cedar-expr';

export interface CedarExprRecord extends CedarExpr {
  [key: string]: CedarExpr;
}

export const isCedarExprRecord = (obj: any): obj is CedarExprRecord => {
  return typeof obj === 'object';
};

export const cedarExprRecordToJsonExpr = (cedarExpr: CedarExprRecord): JsonExpr => {
  return cedarExpr;
};

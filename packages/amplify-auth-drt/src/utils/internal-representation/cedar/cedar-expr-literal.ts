/* eslint-disable import/no-cycle */
import { JsonExpr } from '../internal-representation';

export type CedarExprLiteral = boolean | number | string;

export const isCedarExprLiteral = (obj: any): obj is CedarExprLiteral => {
  return typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string';
};

export const cedarExprLiteralToJsonExpr = (cedarExpr: CedarExprLiteral): JsonExpr => {
  return cedarExpr;
};

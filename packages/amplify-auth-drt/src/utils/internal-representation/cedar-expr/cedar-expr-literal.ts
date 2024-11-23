/* eslint-disable import/no-cycle */
import { JsonExprLiteral } from '../json-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';

export type CedarExprLiteral = boolean | number | string;

export const isCedarExprLiteral = (obj: any): obj is CedarExprLiteral => {
  return typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string';
};

export const cedarExprLiteralToJsonExpr = (
  cedarExpr: CedarExprLiteral,
  _: CedarConcreteValueMap | undefined = undefined,
): JsonExprLiteral => {
  return cedarExpr;
};

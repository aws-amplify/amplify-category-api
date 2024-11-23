/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExprUnknown } from '../json-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';
import { isCedarExprValue } from './cedar-expr-value';

export interface CedarExprUnknown {
  unknown: { Value: string }[];
}

export const isCedarExprUnknown = (obj: any): obj is CedarExprUnknown => {
  return (
    obj &&
    hasKey(obj, 'unknown') &&
    Array.isArray(obj['unknown']) &&
    obj['unknown'].length > 0 &&
    isCedarExprValue(obj['unknown'][0]) &&
    typeof obj['unknown'][0].Value === 'string'
  );
};

export const cedarExprUnknownToJsonExpr = (
  cedarExpr: CedarExprUnknown,
  _: CedarConcreteValueMap | undefined = undefined,
): JsonExprUnknown => {
  return { unknown: cedarExpr.unknown[0].Value };
};

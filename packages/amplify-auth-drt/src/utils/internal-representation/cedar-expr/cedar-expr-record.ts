/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr, JsonExprRecord } from '../json-expr';
import { CedarExpr } from './cedar-expr';
import { CedarConcreteValueMap } from './cedar-expr-attr-access';
import { cedarExprToJsonExpr } from './cedar-ir';

export interface CedarExprRecord {
  Record: Record<string, CedarExpr>;
}

export const isCedarExprRecord = (obj: any): obj is CedarExprRecord => {
  return hasKey(obj, 'Record') && typeof obj['Record'] === 'object';
};

export const cedarExprRecordToJsonExpr = (
  cedarExpr: CedarExprRecord,
  valueMap: CedarConcreteValueMap | undefined = undefined,
): JsonExprRecord => {
  const record = Object.entries(cedarExpr.Record).reduce(
    (acc: Record<string, JsonExpr>, curr: [string, CedarExpr]): Record<string, JsonExpr> => {
      return {
        ...acc,
        ...{
          [curr[0]]: cedarExprToJsonExpr(curr[1], valueMap),
        },
      };
    },
    {} as Record<string, JsonExpr>,
  );
  return { record };
};

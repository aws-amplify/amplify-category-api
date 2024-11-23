/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../json-expr';
import { AmplifyAuthFilterExpr } from './amplify-auth-filter-expr';
import { amplifyAuthExprToJsonExpr } from './amplify-auth-ir';

/**
 * Represents an `and` filter epression. For SQL, this would be equivalent to a WHERE clause with `AND(<conditions>)`
 */
export interface AmplifyAuthExprAnd extends AmplifyAuthFilterExpr {
  and: AmplifyAuthFilterExpr[];
}

export const isAmplifyAuthExprAnd = (obj: any): obj is AmplifyAuthExprAnd => {
  return hasKey(obj, 'and') && Array.isArray(obj['and']);
};

export const amplifyAuthExprAndToJsonExpr = (amplifyAuthExpr: AmplifyAuthExprAnd): JsonExpr => {
  return {
    and: amplifyAuthExpr.and.map(amplifyAuthExprToJsonExpr),
  };
};

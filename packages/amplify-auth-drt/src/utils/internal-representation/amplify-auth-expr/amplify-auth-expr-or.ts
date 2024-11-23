/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../json-expr';
import { AmplifyAuthFilterExpr } from './amplify-auth-filter-expr';
import { amplifyAuthExprToJsonExpr } from './amplify-auth-ir';

/**
 * Represents an `or` filter epression. For SQL, this would be equivalent to a WHERE clause with `OR(<conditions>)`
 */
export interface AmplifyAuthExprOr extends AmplifyAuthFilterExpr {
  or: AmplifyAuthFilterExpr[];
}

export const isAmplifyAuthExprOr = (obj: any): obj is AmplifyAuthExprOr => {
  return hasKey(obj, 'or') && Array.isArray(obj['or']);
};

export const amplifyAuthExprOrToJsonExpr = (amplifyAuthExpr: AmplifyAuthExprOr): JsonExpr => {
  return {
    or: amplifyAuthExpr.or.map(amplifyAuthExprToJsonExpr),
  };
};

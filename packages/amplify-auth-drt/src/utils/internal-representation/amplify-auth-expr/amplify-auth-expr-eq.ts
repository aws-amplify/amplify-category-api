/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../json-expr';
import { AmplifyAuthFilterExpr } from './amplify-auth-filter-expr';

/**
 * A filter condition that requires a field (the key of the object) to equal a value (the value of the `eq` field)
 *
 * Example:
 *
 * The expression
 * ```json
 * {
 *   "owner": {
 *     "eq": "abc-1234"
 *   }
 * }
 * ```
 *
 * requires `owner == "abc-1234"` to be true
 *
 */
export interface AmplifyAuthExprEq extends AmplifyAuthFilterExpr {
  [key: string]: {
    eq: string;
  };
}

export const isAmplifyAuthExprEq = (obj: any): obj is AmplifyAuthExprEq => {
  if (typeof obj !== 'object') {
    return false;
  }

  const keys = Object.keys(obj);
  if (keys.length !== 1) {
    return false;
  }

  const key = keys[0];

  const val = obj[key];
  if (typeof val !== 'object') {
    return false;
  }

  if (!hasKey(val, 'eq')) {
    return false;
  }

  return typeof val['eq'] === 'string';
};

/**
 * We know that authFilters are always evaluated as a query expression. This method converts the string-literal comparisons from the auth
 * filter into the structured intermediate representation as a property of `resource`.
 *
 * Example:
 * ```
 * amplifyAuthExprEqToJsonExpr({
 *   'owner': { eq: 'uuid' }
 * }) == {
 *   eq: {
 *     left: {
 *       attr: {
 *         left: { var: 'resource' },
 *         attr: 'owner'
 *       }
 *     },
 *     right: 'uuid'
 *   }
 * }
 * ```
 */
export const amplifyAuthExprEqToJsonExpr = (amplifyAuthExpr: AmplifyAuthExprEq): JsonExpr => {
  const reference = Object.keys(amplifyAuthExpr)[0];
  const value = amplifyAuthExpr[reference].eq;
  return {
    eq: {
      left: {
        attr: {
          left: { var: 'resource' },
          attr: reference,
        },
      },
      right: value,
    },
  };
};

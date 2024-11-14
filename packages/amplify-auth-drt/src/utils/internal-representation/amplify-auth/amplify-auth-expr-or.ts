/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../internal-representation';
import { AmplifyAuthFilterExpr } from './amplify-auth-filter-expr';
import { amplifyAuthExprToJsonExpr } from './amplify-auth-ir';

/*
  {
    or: [
      {
        owner: {
          eq: 'uuid::my-username',
        },
      },
      {
        owner: {
          eq: 'uuid',
        },
      },
      {
        owner: {
          eq: 'my-username',
        },
      },
    ],
  }
 */

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
  const leftExpr = amplifyAuthExpr['or'][0];
  const rest = amplifyAuthExpr['or'].slice(1);
  const rightExpr = rest.length === 1 ? rest[0] : { or: rest };
  return {
    or: {
      left: amplifyAuthExprToJsonExpr(leftExpr),
      right: amplifyAuthExprToJsonExpr(rightExpr),
    },
  };
};

/* eslint-disable import/no-cycle */
import { hasKey } from '../../type-utils';
import { JsonExpr } from '../internal-representation';
import { AmplifyAuthFilterExpr } from './amplify-auth-filter-expr';
import { amplifyAuthExprToJsonExpr } from './amplify-auth-ir';

/*
  {
    and: [
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
 * Represents an `and` filter epression. For SQL, this would be equivalent to a WHERE clause with `AND(<conditions>)`
 */
export interface AmplifyAuthExprAnd extends AmplifyAuthFilterExpr {
  and: AmplifyAuthFilterExpr[];
}

export const isAmplifyAuthExprAnd = (obj: any): obj is AmplifyAuthExprAnd => {
  return hasKey(obj, 'and') && Array.isArray(obj['and']);
};

export const amplifyAuthExprAndToJsonExpr = (amplifyAuthExpr: AmplifyAuthExprAnd): JsonExpr => {
  const leftExpr = amplifyAuthExpr['and'][0];
  const rest = amplifyAuthExpr['and'].slice(1);
  const rightExpr = rest.length === 1 ? rest[0] : { and: rest };
  return {
    and: {
      left: amplifyAuthExprToJsonExpr(leftExpr),
      right: amplifyAuthExprToJsonExpr(rightExpr),
    },
  };
};

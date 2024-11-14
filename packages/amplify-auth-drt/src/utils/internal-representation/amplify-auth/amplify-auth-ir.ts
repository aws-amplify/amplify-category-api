/* eslint-disable import/no-cycle */
import { JsonExpr } from '../internal-representation';
import { amplifyAuthExprAndToJsonExpr, isAmplifyAuthExprAnd } from './amplify-auth-expr-and';
import { isAmplifyAuthExprEq, amplifyAuthExprEqToJsonExpr } from './amplify-auth-expr-eq';
import { isAmplifyAuthExprOr, amplifyAuthExprOrToJsonExpr } from './amplify-auth-expr-or';
import { AmplifyAuthFilterExpr } from './amplify-auth-filter-expr';

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

export const amplifyAuthExprToJsonExpr = (amplifyAuthExpr: AmplifyAuthFilterExpr): JsonExpr => {
  if (isAmplifyAuthExprAnd(amplifyAuthExpr)) {
    return amplifyAuthExprAndToJsonExpr(amplifyAuthExpr);
  } else if (isAmplifyAuthExprEq(amplifyAuthExpr)) {
    return amplifyAuthExprEqToJsonExpr(amplifyAuthExpr);
  } else if (isAmplifyAuthExprOr(amplifyAuthExpr)) {
    return amplifyAuthExprOrToJsonExpr(amplifyAuthExpr);
  } else {
    throw new Error(`Unsupported expression type '${JSON.stringify(amplifyAuthExpr)}'`);
  }
};

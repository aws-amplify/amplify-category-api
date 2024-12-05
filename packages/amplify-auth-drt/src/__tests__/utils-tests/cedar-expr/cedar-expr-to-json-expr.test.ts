import { cedarExprToJsonExpr } from '../../../utils';
import { cedarPartialEvaluation, intermediateRep } from '../constants';

describe('cedarExprToJsonExpr', () => {
  test('simple case', () => {
    const cedarExpr = cedarPartialEvaluation.residuals?.[0].conditions[0].body;
    const actualValue = cedarExprToJsonExpr(cedarExpr!);
    expect(actualValue).toEqual(intermediateRep);
  });
});

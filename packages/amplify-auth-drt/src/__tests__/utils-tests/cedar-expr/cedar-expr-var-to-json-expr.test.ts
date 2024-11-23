import { CedarExprVarAllowedValue, cedarExprVarToJsonExpr } from '../../../utils';

describe('cedarExprVarToJsonExpr', () => {
  const allowedValues = ['principal', 'action', 'resource', 'context'];
  test.each(allowedValues)('handles %s', (val) => {
    expect(cedarExprVarToJsonExpr({ Var: val as CedarExprVarAllowedValue })).toEqual({ var: val });
  });
});

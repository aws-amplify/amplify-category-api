import * as fc from 'fast-check';
import { cedarExprRecordToJsonExpr } from '../../../utils';

// TODO: Flesh out the test with custom Arbitraries for each type of CedarExpr
describe('cedarExprRecordToJsonExpr', () => {
  test('handles arbitrary shape', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (key, val) => {
        const record = { Record: { [key]: { Value: val } } };
        expect(cedarExprRecordToJsonExpr(record)).toEqual({ record: { [key]: { value: val } } });
      }),
    );
  });
});

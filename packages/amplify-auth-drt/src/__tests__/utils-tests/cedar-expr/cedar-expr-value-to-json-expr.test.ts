import * as fc from 'fast-check';
import { cedarExprValueToJsonExpr } from '../../../utils';

describe('cedarExprValueToJsonExpr', () => {
  test('handles booleans', () => {
    fc.assert(
      fc.property(fc.boolean(), (val) => {
        expect(cedarExprValueToJsonExpr({ Value: val })).toEqual({ value: val });
      }),
    );
  });

  test('handles integers', () => {
    fc.assert(
      fc.property(fc.integer(), (val) => {
        expect(cedarExprValueToJsonExpr({ Value: val })).toEqual({ value: val });
      }),
    );
  });

  test('handles floats', () => {
    fc.assert(
      fc.property(fc.float(), (val) => {
        expect(cedarExprValueToJsonExpr({ Value: val })).toEqual({ value: val });
      }),
    );
  });

  test('handles strings', () => {
    fc.assert(
      fc.property(fc.string(), (val) => {
        expect(cedarExprValueToJsonExpr({ Value: val })).toEqual({ value: val });
      }),
    );
  });
});

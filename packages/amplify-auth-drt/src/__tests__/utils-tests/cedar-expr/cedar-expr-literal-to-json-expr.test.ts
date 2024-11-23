import * as fc from 'fast-check';
import { cedarExprLiteralToJsonExpr } from '../../../utils';

describe('cedarExprLiteralToJsonExprLiteral', () => {
  test('handles booleans', () => {
    expect(cedarExprLiteralToJsonExpr(true)).toEqual(true);
    fc.assert(
      fc.property(fc.boolean(), (val) => {
        expect(cedarExprLiteralToJsonExpr(val)).toEqual(val);
      }),
    );
  });

  test('handles integers', () => {
    fc.assert(
      fc.property(fc.integer(), (val) => {
        expect(cedarExprLiteralToJsonExpr(val)).toEqual(val);
      }),
    );
  });

  test('handles floats', () => {
    fc.assert(
      fc.property(fc.float(), (val) => {
        expect(cedarExprLiteralToJsonExpr(val)).toEqual(val);
      }),
    );
  });

  test('handles strings', () => {
    fc.assert(
      fc.property(fc.string(), (val) => {
        expect(cedarExprLiteralToJsonExpr(val)).toEqual(val);
      }),
    );
  });
});

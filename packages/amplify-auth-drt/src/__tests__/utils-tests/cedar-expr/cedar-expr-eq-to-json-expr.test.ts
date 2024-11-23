import * as fc from 'fast-check';
import { cedarExprEqToJsonExpr } from '../../../utils';

describe('cedarExprEqToJsonExpr', () => {
  test('handles booleans', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (left, right) => {
        expect(cedarExprEqToJsonExpr({ '==': { left, right } })).toEqual({ eq: { left, right } });
      }),
    );
  });

  test('handles integers', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (left, right) => {
        expect(cedarExprEqToJsonExpr({ '==': { left, right } })).toEqual({ eq: { left, right } });
      }),
    );
  });

  test('handles floats', () => {
    fc.assert(
      fc.property(fc.float(), fc.float(), (left, right) => {
        expect(cedarExprEqToJsonExpr({ '==': { left, right } })).toEqual({ eq: { left, right } });
      }),
    );
  });

  test('handles strings', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (left, right) => {
        expect(cedarExprEqToJsonExpr({ '==': { left, right } })).toEqual({ eq: { left, right } });
      }),
    );
  });
});

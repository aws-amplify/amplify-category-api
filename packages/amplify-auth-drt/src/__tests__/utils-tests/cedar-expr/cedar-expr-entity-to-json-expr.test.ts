import * as fc from 'fast-check';
import { cedarExprEntityToJsonExpr } from '../../../utils';

describe('cedarExprEntityToJsonExpr', () => {
  test('simple case', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (entityType, id) => {
        expect(cedarExprEntityToJsonExpr({ __entity: { type: entityType, id } })).toEqual({ __entity: { type: entityType, id } });
      }),
    );
  });
});

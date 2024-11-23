import * as fc from 'fast-check';
import { cedarExprUnknownToJsonExpr } from '../../../utils';

describe('cedarExprUnknownToJsonExpr', () => {
  test('recognizes correctly shaped objects', () => {
    fc.assert(
      fc.property(
        fc.record(
          {
            unknown: fc.array(fc.record({ Value: fc.string() }), { maxLength: 1, minLength: 1 }),
          },
          { requiredKeys: ['unknown'] },
        ),
        (record) => {
          expect(cedarExprUnknownToJsonExpr(record as any)).toEqual({
            unknown: record.unknown[0].Value,
          });
        },
      ),
    );
  });
});

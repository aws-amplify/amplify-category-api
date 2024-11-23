import * as fc from 'fast-check';
import { cedarExprOrToJsonExpr } from '../../../utils';

describe('cedarExprOrToJsonExpr', () => {
  test('handles booleans', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (left, right) => {
        expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({ or: [left, right] });
      }),
    );
  });

  test('handles integers', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (left, right) => {
        expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({ or: [left, right] });
      }),
    );
  });

  test('handles floats', () => {
    fc.assert(
      fc.property(fc.float(), fc.float(), (left, right) => {
        expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({ or: [left, right] });
      }),
    );
  });

  test('handles strings', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (left, right) => {
        expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({ or: [left, right] });
      }),
    );
  });

  test('handles records', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), fc.string(), (leftKey, leftVal, rightKey, rightVal) => {
        const left = { Record: { [leftKey]: { Value: leftVal } } };
        const expectedLeft = { record: { [leftKey]: { value: leftVal } } };
        const right = { Record: { [rightKey]: { Value: rightVal } } };
        const expectedRight = { record: { [rightKey]: { value: rightVal } } };
        expect(cedarExprOrToJsonExpr({ '||': { left, right } })).toEqual({
          or: [expectedLeft, expectedRight],
        });
      }),
    );
  });

  test('handles simple conditions on left and right', () => {
    expect(
      cedarExprOrToJsonExpr({
        '||': {
          left: '1.left',
          right: '1.right',
        },
      }),
    ).toEqual({
      or: ['1.left', '1.right'],
    });
  });

  test('handles nested and conditions on left', () => {
    expect(
      cedarExprOrToJsonExpr({
        '||': {
          left: {
            '||': {
              left: '2.left',
              right: '2.right',
            },
          },
          right: '1.right',
        },
      }),
    ).toEqual({
      or: ['2.left', '2.right', '1.right'],
    });
  });

  test('handles nested and conditions on right', () => {
    expect(
      cedarExprOrToJsonExpr({
        '||': {
          left: '1.left',
          right: {
            '||': {
              left: '2.left',
              right: '2.right',
            },
          },
        },
      }),
    ).toEqual({
      or: ['1.left', '2.left', '2.right'],
    });
  });

  test('handles nested and conditions on both left and right', () => {
    expect(
      cedarExprOrToJsonExpr({
        '||': {
          left: {
            '||': {
              left: '1.left',
              right: '1.right',
            },
          },
          right: {
            '||': {
              left: '2.left',
              right: '2.right',
            },
          },
        },
      }),
    ).toEqual({
      or: ['1.left', '1.right', '2.left', '2.right'],
    });
  });

  test('handles complex example', () => {
    expect(
      cedarExprOrToJsonExpr({
        '||': {
          left: {
            '||': {
              left: {
                '==': {
                  left: '1.left',
                  right: '1.right',
                },
              },
              right: {
                '==': {
                  left: '2.left',
                  right: '2.right',
                },
              },
            },
          },
          right: {
            '&&': {
              left: '3.left',
              right: {
                '||': {
                  left: '4.left',
                  right: '4.right',
                },
              },
            },
          },
        },
      }),
    ).toEqual({
      or: [
        {
          eq: {
            left: '1.left',
            right: '1.right',
          },
        },
        {
          eq: {
            left: '2.left',
            right: '2.right',
          },
        },
        {
          and: [
            '3.left',
            {
              or: ['4.left', '4.right'],
            },
          ],
        },
      ],
    });
  });
});

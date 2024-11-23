import * as fc from 'fast-check';
import { cedarExprAndToJsonExpr } from '../../../utils';

describe('cedarExprAndToJsonExpr', () => {
  test('handles booleans', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (left, right) => {
        expect(cedarExprAndToJsonExpr({ '&&': { left, right } })).toEqual({ and: [left, right] });
      }),
    );
  });

  test('handles integers', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (left, right) => {
        expect(cedarExprAndToJsonExpr({ '&&': { left, right } })).toEqual({ and: [left, right] });
      }),
    );
  });

  test('handles floats', () => {
    fc.assert(
      fc.property(fc.float(), fc.float(), (left, right) => {
        expect(cedarExprAndToJsonExpr({ '&&': { left, right } })).toEqual({ and: [left, right] });
      }),
    );
  });

  test('handles strings', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (left, right) => {
        expect(cedarExprAndToJsonExpr({ '&&': { left, right } })).toEqual({ and: [left, right] });
      }),
    );
  });

  test('handles simple conditions on left and right', () => {
    expect(
      cedarExprAndToJsonExpr({
        '&&': {
          left: '1.left',
          right: '1.right',
        },
      }),
    ).toEqual({
      and: ['1.left', '1.right'],
    });
  });

  test('handles nested and conditions on left', () => {
    expect(
      cedarExprAndToJsonExpr({
        '&&': {
          left: {
            '&&': {
              left: '2.left',
              right: '2.right',
            },
          },
          right: '1.right',
        },
      }),
    ).toEqual({
      and: ['2.left', '2.right', '1.right'],
    });
  });

  test('handles nested and conditions on right', () => {
    expect(
      cedarExprAndToJsonExpr({
        '&&': {
          left: '1.left',
          right: {
            '&&': {
              left: '2.left',
              right: '2.right',
            },
          },
        },
      }),
    ).toEqual({
      and: ['1.left', '2.left', '2.right'],
    });
  });

  test('handles nested and conditions on both left and right', () => {
    expect(
      cedarExprAndToJsonExpr({
        '&&': {
          left: {
            '&&': {
              left: '1.left',
              right: '1.right',
            },
          },
          right: {
            '&&': {
              left: '2.left',
              right: '2.right',
            },
          },
        },
      }),
    ).toEqual({
      and: ['1.left', '1.right', '2.left', '2.right'],
    });
  });

  test('handles complex example', () => {
    expect(
      cedarExprAndToJsonExpr({
        '&&': {
          left: {
            '&&': {
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
      and: [
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
        '3.left',
        {
          or: ['4.left', '4.right'],
        },
      ],
    });
  });
});

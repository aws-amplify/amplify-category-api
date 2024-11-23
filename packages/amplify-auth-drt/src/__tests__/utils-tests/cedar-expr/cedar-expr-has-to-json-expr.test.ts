import { cedarExprHasToJsonExpr } from '../../../utils';

describe('cedarExprHasToJsonExpr', () => {
  test('handles simple case', () => {
    expect(
      cedarExprHasToJsonExpr({
        has: {
          left: {
            Var: 'context',
          },
          attr: 'something',
        },
      }),
    ).toEqual({ has: { left: { var: 'context' }, attr: 'something' } });
  });

  test('handles nested case', () => {
    expect(
      cedarExprHasToJsonExpr({
        has: {
          left: {
            has: {
              left: {
                Var: 'context',
              },
              attr: 'result',
            },
          },
          attr: 'owner',
        },
      }),
    ).toEqual({
      has: {
        left: {
          has: {
            left: { var: 'context' },
            attr: 'result',
          },
        },
        attr: 'owner',
      },
    });
  });
});

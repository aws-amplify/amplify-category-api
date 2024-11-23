import { cedarExprAttrAccessToJsonExpr } from '../../../utils';

describe('cedarExprAttrAccessToJsonExpr', () => {
  test('handles simple case', () => {
    expect(
      cedarExprAttrAccessToJsonExpr({
        '.': {
          left: {
            Var: 'context',
          },
          attr: 'something',
        },
      }),
    ).toEqual({
      attr: {
        left: { var: 'context' },
        attr: 'something',
      },
    });
  });

  test('handles nested case', () => {
    expect(
      cedarExprAttrAccessToJsonExpr({
        '.': {
          left: {
            '.': {
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
      attr: {
        left: {
          attr: {
            left: { var: 'context' },
            attr: 'result',
          },
        },
        attr: 'owner',
      },
    });
  });

  test('handles replacement values', () => {
    expect(
      cedarExprAttrAccessToJsonExpr(
        {
          '.': {
            left: {
              Var: 'principal',
            },
            attr: 'sub',
          },
        },
        {
          principal: {
            sub: 'uuid',
            username: 'my-username',
            subUsername: 'uuid::my-username',
          },
        },
      ),
    ).toEqual('uuid');
  });
});

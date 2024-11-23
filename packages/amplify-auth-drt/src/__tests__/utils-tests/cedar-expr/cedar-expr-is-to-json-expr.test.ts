import { cedarExprIsToJsonExpr } from '../../../utils';

describe('cedarExprIsToJsonExpr', () => {
  test('handles simple case', () => {
    expect(
      cedarExprIsToJsonExpr({
        is: {
          left: {
            Var: 'context',
          },
          entity_type: 'something',
        },
      }),
    ).toEqual({ is: { left: { var: 'context' }, entityType: 'something' } });
  });

  test('handles values with "in" field', () => {
    expect(
      cedarExprIsToJsonExpr({
        is: {
          left: {
            Var: 'context',
          },
          entity_type: 'something',
          in: { Value: { __entity: { type: 'Folder', id: 'Public' } } },
        },
      }),
    ).toEqual({ is: { left: { var: 'context' }, entityType: 'something', in: { value: { __entity: { type: 'Folder', id: 'Public' } } } } });
  });
});

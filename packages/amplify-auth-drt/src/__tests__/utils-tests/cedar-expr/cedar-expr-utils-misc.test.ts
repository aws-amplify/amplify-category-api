import * as fc from 'fast-check';

import { isCedarBinaryOperatorWithKey } from '../../../utils';

describe('isCedarBinaryOperatorWithKey', () => {
  test('empty object', () => {
    expect(isCedarBinaryOperatorWithKey({}, 'foo')).toBeFalsy();
  });

  test('empty keys', () => {
    expect(isCedarBinaryOperatorWithKey({ '': '' }, 'foo')).toBeFalsy();
  });

  test('left but no right', () => {
    expect(isCedarBinaryOperatorWithKey({ foo: { left: 'abc' } }, 'foo')).toBeFalsy();
  });

  test('right but no left', () => {
    expect(isCedarBinaryOperatorWithKey({ foo: { right: 'abc' } }, 'foo')).toBeFalsy();
  });

  test('recognizes correctly shaped objects', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.record(
          {
            left: fc.string(),
            right: fc.string(),
          },
          { requiredKeys: ['left', 'right'] },
        ),
        (key, record) => {
          const obj = { [key]: record };
          expect(isCedarBinaryOperatorWithKey(obj, key)).toBeTruthy();
        },
      ),
    );
  });
});

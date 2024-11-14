import { hasKey } from '../../utils/type-utils';

describe('type-utils', () => {
  describe('hasKey', () => {
    test('returns true if key is present', () => {
      expect(hasKey({ '&&': { left: true, right: false } }, '&&')).toBeTruthy();
    });
    test('returns false if key is not present', () => {
      expect(hasKey({ '&&': { left: true, right: false } }, 'ZZZ')).toBeFalsy();
    });
    test('handles empty objeccts', () => {
      expect(hasKey({}, 'ZZZ')).toBeFalsy();
    });
    test('handles undefined', () => {
      expect(hasKey(undefined, 'ZZZ')).toBeFalsy();
    });
    test('handles null', () => {
      expect(hasKey(null, 'ZZZ')).toBeFalsy();
    });
    test('handles strings', () => {
      expect(hasKey('ZZZ', 'ZZZ')).toBeFalsy();
    });
    test('handles numbers', () => {
      expect(hasKey(1234, '1234')).toBeFalsy();
    });
  });
});

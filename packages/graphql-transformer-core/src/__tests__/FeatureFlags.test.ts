import { FeatureFlagProvider, NoopFeatureFlagProvider } from '../FeatureFlags';

describe('NoopFeatureFlagProvider', () => {
  const ff = new NoopFeatureFlagProvider();
  test('getBoolean to return default value', () => {
    expect(ff.getBoolean('testFlag', true)).toEqual(true);
    expect(ff.getBoolean('testFlag', false)).toEqual(false);
  });

  test('getBoolean to throw error if no default value is passed', () => {
    expect(() => ff.getBoolean('testFlag')).toThrowError('No value found for feature testFlag');
  });

  test('getNumber to return default value', () => {
    expect(ff.getNumber('testFlag', 12)).toEqual(12);
  });

  test('getNumber to throw error if no default value is passed', () => {
    expect(() => ff.getNumber('testNumberFlag')).toThrowError('No value found for feature testNumberFlag');
  });
});

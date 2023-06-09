import { legacyApiKeyEnabledFromParameters } from '../../graphql-transformer/transformer-options-v2';

describe('legacyApiKeyEnabledFromParameters', () => {
  it('returns undefined if not defined in params', () => {
    expect(legacyApiKeyEnabledFromParameters({})).toBeUndefined();
  });

  it('returns true if value is set to 1', () => {
    expect(legacyApiKeyEnabledFromParameters({ CreateAPIKey: 1 })).toEqual(true);
  });

  it('returns false if value is set to 0', () => {
    expect(legacyApiKeyEnabledFromParameters({ CreateAPIKey: 0 })).toEqual(false);
  });

  it('returns false if value is set to -1', () => {
    expect(legacyApiKeyEnabledFromParameters({ CreateAPIKey: -1 })).toEqual(false);
  });
});

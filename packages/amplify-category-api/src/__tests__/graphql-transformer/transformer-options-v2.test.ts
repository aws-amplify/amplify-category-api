import { suppressApiKeyGeneration } from '../../graphql-transformer/transformer-options-v2';

describe('suppressApiKeyGeneration', () => {
  it('returns false if not defined in params', () => {
    expect(suppressApiKeyGeneration({})).toEqual(false);
  });

  it('returns true if value is set to 1', () => {
    expect(suppressApiKeyGeneration({ CreateAPIKey: 1 })).toEqual(false);
  });

  it('returns false if value is set to 0', () => {
    expect(suppressApiKeyGeneration({ CreateAPIKey: 0 })).toEqual(true);
  });

  it('returns false if value is set to -1', () => {
    expect(suppressApiKeyGeneration({ CreateAPIKey: -1 })).toEqual(true);
  });
});

import { FeatureFlags } from '@aws-amplify/amplify-cli-core';
import { AmplifyCLIFeatureFlagAdapter } from '../../graphql-transformer/amplify-cli-feature-flag-adapter';

jest.mock('@aws-amplify/amplify-cli-core');

describe('AmplifyCLIFeatureFlagAdapter', () => {
  const ff = new AmplifyCLIFeatureFlagAdapter();
  const transformerFeatureFlagPrefix = 'graphQLTransformer';

  describe('getBoolean', () => {
    test('getBoolean to return default value', () => {
      (<any>FeatureFlags.getBoolean).mockReturnValue(true);
      const flagName = 'testFlag';
      expect(ff.getBoolean(flagName, true)).toEqual(true);
      expect(FeatureFlags.getBoolean).toHaveBeenCalledWith(`${transformerFeatureFlagPrefix}.${flagName}`);
    });

    test('getBoolean should return defaultValue when the FF throw error', () => {
      (<any>FeatureFlags.getBoolean).mockImplementation(() => {
        throw new Error('Error');
      });
      const flagName = 'testFlag';
      expect(ff.getBoolean(flagName, true)).toEqual(true);
      expect(FeatureFlags.getBoolean).toHaveBeenCalledWith(`${transformerFeatureFlagPrefix}.${flagName}`);
    });

    test('getBoolean should throw error when defaultValue is missing and the FF throw error', () => {
      (<any>FeatureFlags.getBoolean).mockImplementation(() => {
        throw new Error('Error');
      });
      const flagName = 'testFlag';
      expect(() => ff.getBoolean(flagName)).toThrowError();
      expect(FeatureFlags.getBoolean).toHaveBeenCalledWith(`${transformerFeatureFlagPrefix}.${flagName}`);
    });
  });

  describe('getNumber', () => {
    test('getNumber to return default value', () => {
      const expectedValue = 22;
      (<any>FeatureFlags.getNumber).mockReturnValue(expectedValue);
      const flagName = 'testFlag';
      expect(ff.getNumber(flagName, 12)).toEqual(expectedValue);
      expect(FeatureFlags.getNumber).toHaveBeenCalledWith(`${transformerFeatureFlagPrefix}.${flagName}`);
    });

    test('getNumber should return defaultValue when the FF throw error', () => {
      (<any>FeatureFlags.getNumber).mockImplementation(() => {
        throw new Error('Error');
      });
      const flagName = 'testFlag';
      const expectedValue = 44;
      expect(ff.getNumber(flagName, expectedValue)).toEqual(expectedValue);
      expect(FeatureFlags.getNumber).toHaveBeenCalledWith(`${transformerFeatureFlagPrefix}.${flagName}`);
    });

    test('getNumber should throw error when defaultValue is missing and the FF throw error', () => {
      (<any>FeatureFlags.getNumber).mockImplementation(() => {
        throw new Error('Error');
      });
      const flagName = 'testFlag';
      expect(() => ff.getNumber(flagName)).toThrowError();
      expect(FeatureFlags.getNumber).toHaveBeenCalledWith(`${transformerFeatureFlagPrefix}.${flagName}`);
    });
  });
});

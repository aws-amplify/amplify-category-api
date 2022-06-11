import { FeatureFlagProvider } from '@aws-amplify/graphql-transformer-interfaces';

/**
 * Merges passed in feature flags with default feature flags for tests
 */
export const featureFlags: FeatureFlagProvider = {
  getBoolean: (value: string, defaultValue: boolean): boolean => {
    if (value === 'useSubUsernameForDefaultIdentityClaim') {
      return true;
    }
    return defaultValue;
  },
  getString: jest.fn(),
  getNumber: jest.fn(),
  getObject: jest.fn(),
};

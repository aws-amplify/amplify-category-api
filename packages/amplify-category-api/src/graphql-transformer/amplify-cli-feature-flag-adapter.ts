import { FeatureFlags } from '@aws-amplify/amplify-cli-core';
import { FeatureFlagProvider } from 'graphql-transformer-core';

export class AmplifyCLIFeatureFlagAdapterBase implements FeatureFlagProvider {
  getBoolean(featureName: string, defaultValue?: boolean): boolean {
    return this.getValue<boolean>(featureName, 'boolean', defaultValue);
  }

  getNumber(featureName: string, defaultValue?: number): number {
    return this.getValue<number>(featureName, 'number', defaultValue);
  }

  getObject(): object {
    // Todo: for future extensibility
    throw new Error('Not implemented');
  }

  protected getValue<T extends number | boolean>(featureName: string, type: 'boolean' | 'number' | 'string', defaultValue: T): T {
    const keyName = `graphQLTransformer.${featureName}`;
    try {
      switch (type) {
        case 'boolean':
          return FeatureFlags.getBoolean(keyName) as T;
        case 'number':
          return FeatureFlags.getNumber(keyName) as T;
      }
    } catch (e) {
      if (defaultValue) {
        return defaultValue;
      }
      throw e;
    }
  }
}

// Mapping to new type to ensure the provider interface is implemented
export class AmplifyCLIFeatureFlagAdapter extends AmplifyCLIFeatureFlagAdapterBase {}

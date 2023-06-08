/* eslint-disable class-methods-use-this */
import { FeatureFlagProvider } from '@aws-amplify/graphql-transformer-interfaces';

export class NoopFeatureFlagProvider implements FeatureFlagProvider {
  getBoolean(_: string, defaultValue?: boolean): boolean {
    return defaultValue ?? false;
  }

  getNumber(_: string, defaultValue?: number): number {
    return defaultValue ?? 0;
  }

  getObject(): object {
    // Todo: for future extensibility
    throw new Error('Not implemented');
  }
}

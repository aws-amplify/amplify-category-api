import { FeatureFlagProvider } from '@aws-amplify/graphql-transformer-interfaces';

/**
 *
 */
export class NoopFeatureFlagProvider implements FeatureFlagProvider {
  /**
   *
   * @param featureName
   * @param options
   */
  getBoolean(featureName: string, options?: boolean): boolean {
    return this.getValue<boolean>(featureName, options);
  }

  /**
   *
   * @param featureName
   * @param options
   */
  getNumber(featureName: string, options?: number): number {
    return this.getValue<number>(featureName, options);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  /**
   *
   */
  getObject(): object {
    // Todo: for future extensibility
    throw new Error('Not implemented');
  }

  protected getValue<T extends number | boolean>(featureName: string, defaultValue?: T): T {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`No value found for feature ${featureName}`);
  }
}

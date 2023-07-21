export interface FeatureFlagProvider {
  getBoolean(featureName: string, defaultValue?: boolean | null): boolean;
  getNumber(featureName: string, defaultValue?: Number): Number;
  getObject(featureName: string, defaultValue?: object): object;
}

export class NoopFeatureFlagProvider implements FeatureFlagProvider {
  getBoolean(featureName: string, options?: boolean): boolean {
    return this.getValue<boolean>(featureName, options);
  }

  getNumber(featureName: string, options?: number): number {
    return this.getValue<number>(featureName, options);
  }

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

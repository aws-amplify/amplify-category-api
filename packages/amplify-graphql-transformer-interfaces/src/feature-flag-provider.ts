export interface FeatureFlagProvider {
  getBoolean(featureName: string, defaultValue?: boolean): boolean;
  getNumber(featureName: string, defaultValue?: number): number;
  getObject(featureName: string, defaultValue?: object): object; // eslint-disable-line @typescript-eslint/ban-types
}

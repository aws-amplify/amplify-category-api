// NOTE: These types are duplicated from packages/amplify-graphql-api-construct/src/types.ts
// Before updating this file, ensure that that changes can be, and are, reflected in the other file.
/**
 * Entry representing the required output from the backend for codegen generate commands to work.
 */
export interface IBackendOutputEntry {
  /**
   * The protocol version for this backend output.
   */
  readonly version: string;

  /**
   * The string-map payload of generated config values.
   */
  readonly payload: Record<string, string>;
}

/**
 * Backend output strategy used to write config required for codegen tasks.
 */
export interface IBackendOutputStorageStrategy {
  /**
   * Add an entry to backend output.
   * @param keyName the key
   * @param backendOutputEntry the record to store in the backend output
   */
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  addBackendOutputEntry(keyName: string, backendOutputEntry: IBackendOutputEntry): void;
}

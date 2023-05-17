/**
 *  Use it for all 'any's where we can't define the type, but doing a strict TypeScript conversion
 */
export type $TSAny = any; // eslint-disable-line  @typescript-eslint/no-explicit-any

/**
 * Use it for all object initializer usages: {}
 */
export type $TSObject = Record<string, $TSAny>;

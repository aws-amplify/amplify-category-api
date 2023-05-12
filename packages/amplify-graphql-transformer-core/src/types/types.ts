export type ConstructResourceMeta = {
  rootStack?: StackMeta;
  nestedStack?: StackMeta;
  resourceName: string;
  resourceType: string;
};

export type StackMeta = {
  stackName: string;
  stackType: string;
};

export type ApiStackType = 'models' | 'http' | 'predictions' | 'function' | 'openSearch' | 'rootStack';

/**
 *  Use it for all 'any's where we can't define the type, but doing a strict TypeScript conversion
 */
export type $TSAny = any; // eslint-disable-line  @typescript-eslint/no-explicit-any

/**
 * Use it for all object initializer usages: {}
 */
export type $TSObject = Record<string, $TSAny>;

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

// Temporary types until we can finish full type definition across the whole CLI

/**
 *  Use it for all 'any's where we can't define the type, but doing a strict TypeScript conversion
 */
export type $TSAny = any; // eslint-disable-line  @typescript-eslint/no-explicit-any

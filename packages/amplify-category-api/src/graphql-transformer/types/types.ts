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

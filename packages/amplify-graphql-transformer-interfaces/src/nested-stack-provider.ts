import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

export type NestedStackProviderOptions = {
  estimatedResourceCount?: number;
};

export type NestedStackProvider = {
  provide: (scope: Construct, name: string, options?: NestedStackProviderOptions) => Stack;
};

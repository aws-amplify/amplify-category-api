import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';

export type NestedStackProvider = {
  provide: (scope: Construct, name: string) => Stack;
};

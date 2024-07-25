import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export type NestedStackProvider = {
  provide: (scope: Construct, name: string) => Stack;
};

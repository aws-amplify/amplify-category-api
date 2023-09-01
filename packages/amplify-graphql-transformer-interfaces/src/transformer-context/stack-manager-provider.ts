import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface StackManagerProvider {
  readonly scope: Construct;
  getStack: (stackName: string) => Stack;
  createStack: (stackName: string) => Stack;
  hasStack: (stackName: string) => boolean;
  getScopeFor: (resourceId: string, defaultStackName?: string) => Construct;
}

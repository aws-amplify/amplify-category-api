import { CfnParameter, CfnParameterProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface StackManagerProvider {
  readonly scope: Construct;
  getStack: (stackName: string) => Stack;
  createStack: (stackName: string) => Stack;
  hasStack: (stackName: string) => boolean;
  getScopeFor: (resourceId: string, defaultStackName?: string) => Construct;
  addParameter: (name: string, props: CfnParameterProps) => CfnParameter;
  getParameter: (name: string) => CfnParameter | void;
}

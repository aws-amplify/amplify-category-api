import { Construct } from 'constructs';
import { CfnParameter, CfnParameterProps, Stack } from 'aws-cdk-lib';

export interface StackManagerProvider {
  readonly rootStack: Construct;
  getStack: (stackName: string) => Stack;
  createStack: (stackName: string) => Stack;
  hasStack: (stackName: string) => boolean;
  getStackFor: (resourceId: string, defaultStackName?: string) => Construct;
  addParameter: (name: string, props: CfnParameterProps) => CfnParameter;
  getParameter: (name: string) => CfnParameter | void;
}

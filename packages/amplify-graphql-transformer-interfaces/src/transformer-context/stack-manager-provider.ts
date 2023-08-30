import { CfnParameter, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface StackManagerProvider {
  readonly scope: Construct;
  getStack: (stackName: string) => Stack;
  createStack: (stackName: string) => Stack;
  hasStack: (stackName: string) => boolean;
  getScopeFor: (resourceId: string, defaultStackName?: string) => Construct;

  /**
   * Retrieve the given scope for a stack name.
   * @deprecated use getScopeFor instead.
   */
  getStackFor: (resourceId: string, defaultStackName?: string) => Construct;

  /**
   * Try and retrieve a parameter for the given name.
   * @deprecated use context.synthParameters instead.
   */
  getParameter: (name: string) => CfnParameter | void;
}

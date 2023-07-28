import { StackManagerProvider, NestedStackProvider, ParameterManager } from '@aws-amplify/graphql-transformer-interfaces';
import { Stack, CfnParameter, CfnParameterProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export type ResourceToStackMap = Record<string, string>;

/**
 * StackManager
 */
export class StackManager implements StackManagerProvider {
  private stacks: Map<string, Stack> = new Map();

  private resourceToStackMap: Map<string, string>;

  constructor(
    public readonly scope: Construct,
    private readonly nestedStackProvider: NestedStackProvider,
    resourceMapping: ResourceToStackMap,
  ) {
    this.resourceToStackMap = new Map(Object.entries(resourceMapping));
  }

  createStack = (stackName: string): Stack => {
    const newStack = this.nestedStackProvider.provide(this.scope, stackName);
    this.stacks.set(stackName, newStack);
    return newStack;
  };

  hasStack = (stackName: string): boolean => this.stacks.has(stackName);

  getScopeFor = (resourceId: string, defaultStackName?: string): Construct => {
    const stackName = this.resourceToStackMap.has(resourceId) ? this.resourceToStackMap.get(resourceId) : defaultStackName;
    if (!stackName) {
      return this.scope;
    }
    if (this.hasStack(stackName)) {
      return this.getStack(stackName);
    }
    return this.createStack(stackName);
  };

  getStack = (stackName: string): Stack => {
    if (this.stacks.has(stackName)) {
      return this.stacks.get(stackName)!;
    }
    throw new Error(`Stack ${stackName} is not created`);
  };
}

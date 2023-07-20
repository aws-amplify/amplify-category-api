import { StackManagerProvider, NestedStackProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Stack, CfnParameter, CfnParameterProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export type ResourceToStackMap = Record<string, string>;

/**
 * StackManager
 */
export class StackManager implements StackManagerProvider {
  private stacks: Map<string, Stack> = new Map();

  private resourceToStackMap: Map<string, string>;

  private paramMap: Map<string, CfnParameter> = new Map();

  constructor(
    public readonly scope: Construct,
    private readonly nestedStackProvider: NestedStackProvider,
    resourceMapping: ResourceToStackMap,
  ) {
    // add Env Parameter to ensure to adhere to contract
    this.resourceToStackMap = new Map(Object.entries(resourceMapping));
    this.addParameter('env', {
      default: 'NONE',
      type: 'String',
    });
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

  addParameter = (name: string, props: CfnParameterProps): CfnParameter => {
    const param = new CfnParameter(this.scope, name, props);
    this.paramMap.set(name, param);
    return param;
  };

  getParameter = (name: string): CfnParameter | void => this.paramMap.get(name);
}

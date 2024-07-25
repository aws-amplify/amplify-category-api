import { StackManagerProvider, NestedStackProvider, TransformParameterProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { CfnParameter, Stack } from 'aws-cdk-lib';
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
    private readonly parameterProvider: TransformParameterProvider | undefined,
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

  /**
   * Returns the stack in which `resourceId` was created. If the stack doesn't currently exist, creates one.
   * @param resourceId the resourceId to search for
   * @param defaultStackName the default stack name to retrieve.
   * @returns the stack, or a new one if not yet defined.
   */
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

  /**
   * Alias for `getScopeFor` to maintain some backwards compatibility for 3p plugins.
   * @deprecated - use `getScopeFor` instead.
   * @param resourceId the resourceId to search for
   * @param defaultStackName the default stack name to retrieve.
   * @returns the stack, or a new one if not yet defined.
   */
  getStackFor = (resourceId: string, defaultStackName?: string): Construct => this.getScopeFor(resourceId, defaultStackName);

  /**
   * Retrieve a parameter used for synth.
   * @deprecated - use `context.synthParameters.amplifyEnvironmentName` (e.g. for `env`) to retrieve known parameters.
   * @param name the param name to retrieve.
   * @returns the parameter, or none if not defined.
   */
  getParameter = (name: string): CfnParameter | void => this.parameterProvider && this.parameterProvider.provide(name);

  getStack = (stackName: string): Stack => {
    if (this.stacks.has(stackName)) {
      return this.stacks.get(stackName)!;
    }
    throw new Error(`Stack ${stackName} is not created`);
  };
}

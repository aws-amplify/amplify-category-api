import { StackManagerProvider, NestedStackProvider, TransformParameterProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { CfnParameter, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export type ResourceToStackMap = Record<string, string>;
export type StackManagerOptions = {
  defaultStackResourceEstimateLimit?: number;
  stackResourceEstimateLimits?: Record<string, number>;
  stackResourceCountOverrides?: Record<string, number>;
  resourceEstimateOverrides?: Record<string, number>;
};

// Keep generated nested stacks below CloudFormation's 500 resource limit. Some logical transformer resources synthesize
// multiple CloudFormation resources, so this budget intentionally leaves headroom for metadata and helper resources.
export const DEFAULT_AUTO_STACK_RESOURCE_ESTIMATE = 400;
export const STACK_MANAGER_DEFAULT_STACK_NAME_METADATA = 'aws-amplify:graphql-default-stack-name';
export const STACK_MANAGER_STACK_RESOURCE_ESTIMATE_METADATA = 'aws-amplify:graphql-stack-resource-estimate';
const DEFAULT_RESOURCE_ESTIMATE = 1;
const PIPELINE_RESOLVER_RESOURCE_ESTIMATE = 4;
const LAMBDA_DATA_SOURCE_RESOURCE_ESTIMATE = 3;
const FIRST_OVERFLOW_STACK_INDEX = 2;

/**
 * StackManager
 */
export class StackManager implements StackManagerProvider {
  private stacks: Map<string, Stack> = new Map();

  private resourceToStackMap: Map<string, string>;

  private autoResourceToStackMap: Map<string, string> = new Map();

  private stackResourceEstimates: Map<string, number> = new Map();

  private stackDefaultStackNames: Map<string, string> = new Map();

  private currentStackNameByDefaultStackName: Map<string, string> = new Map();

  private nextStackIndexByDefaultStackName: Map<string, number> = new Map();

  constructor(
    public readonly scope: Construct,
    private readonly nestedStackProvider: NestedStackProvider,
    private readonly parameterProvider: TransformParameterProvider | undefined,
    resourceMapping: ResourceToStackMap,
    private readonly options: StackManagerOptions = {},
  ) {
    this.resourceToStackMap = new Map(Object.entries(resourceMapping));
  }

  createStack = (stackName: string): Stack => {
    if (this.hasStack(stackName)) {
      return this.getStack(stackName);
    }

    const estimatedResourceCount = this.getProviderResourceEstimate(stackName);
    const newStack = this.nestedStackProvider.provide(this.scope, stackName, { estimatedResourceCount });
    const defaultStackName = this.stackDefaultStackNames.get(stackName);
    if (defaultStackName) {
      newStack.node.addMetadata(STACK_MANAGER_DEFAULT_STACK_NAME_METADATA, defaultStackName);
    }
    newStack.node.addMetadata(STACK_MANAGER_STACK_RESOURCE_ESTIMATE_METADATA, estimatedResourceCount);
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
    const stackName = this.getStackNameFor(resourceId, defaultStackName);
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

  private getStackNameFor = (resourceId: string, defaultStackName?: string): string | undefined => {
    if (this.resourceToStackMap.has(resourceId)) {
      return this.resourceToStackMap.get(resourceId);
    }

    if (!defaultStackName) {
      return defaultStackName;
    }

    if (this.autoResourceToStackMap.has(resourceId)) {
      return this.autoResourceToStackMap.get(resourceId);
    }

    const stackName = this.getStackNameWithinResourceBudget(defaultStackName, this.getEstimatedResourceCount(resourceId));
    this.autoResourceToStackMap.set(resourceId, stackName);
    return stackName;
  };

  private getStackNameWithinResourceBudget = (defaultStackName: string, resourceEstimate: number): string => {
    const currentStackName = this.currentStackNameByDefaultStackName.get(defaultStackName) ?? defaultStackName;
    const currentResourceEstimate = this.stackResourceEstimates.get(currentStackName) ?? 0;
    const stackResourceEstimateLimit = this.getStackResourceEstimateLimit(defaultStackName);

    if (currentResourceEstimate > 0 && currentResourceEstimate + resourceEstimate > stackResourceEstimateLimit) {
      const nextStackIndex = this.nextStackIndexByDefaultStackName.get(defaultStackName) ?? FIRST_OVERFLOW_STACK_INDEX;
      const nextStackName = `${defaultStackName}${nextStackIndex}`;
      this.nextStackIndexByDefaultStackName.set(defaultStackName, nextStackIndex + 1);
      this.currentStackNameByDefaultStackName.set(defaultStackName, nextStackName);
      this.stackResourceEstimates.set(nextStackName, resourceEstimate);
      this.stackDefaultStackNames.set(nextStackName, defaultStackName);
      return nextStackName;
    }

    this.currentStackNameByDefaultStackName.set(defaultStackName, currentStackName);
    this.stackResourceEstimates.set(currentStackName, currentResourceEstimate + resourceEstimate);
    this.stackDefaultStackNames.set(currentStackName, defaultStackName);
    return currentStackName;
  };

  private getEstimatedResourceCount = (resourceId: string): number => {
    const estimateOverride = this.options.resourceEstimateOverrides?.[resourceId];
    if (estimateOverride !== undefined) {
      return normalizeResourceEstimate(estimateOverride);
    }

    if (resourceId.startsWith('Invoke') && resourceId.endsWith('LambdaDataSource')) {
      return DEFAULT_RESOURCE_ESTIMATE;
    }

    if (resourceId.endsWith('LambdaDataSource')) {
      return LAMBDA_DATA_SOURCE_RESOURCE_ESTIMATE;
    }

    if (resourceId.endsWith('Resolver')) {
      return PIPELINE_RESOLVER_RESOURCE_ESTIMATE;
    }

    return DEFAULT_RESOURCE_ESTIMATE;
  };

  private getStackResourceEstimateLimit = (defaultStackName: string): number =>
    normalizeResourceEstimate(
      this.options.stackResourceEstimateLimits?.[defaultStackName] ??
        this.options.defaultStackResourceEstimateLimit ??
        DEFAULT_AUTO_STACK_RESOURCE_ESTIMATE,
    );

  private getProviderResourceEstimate = (stackName: string): number =>
    normalizeResourceEstimate(
      this.options.stackResourceCountOverrides?.[stackName] ??
        this.getStackResourceEstimateLimit(this.stackDefaultStackNames.get(stackName) ?? stackName),
    );
}

const normalizeResourceEstimate = (estimate: number): number => Math.max(1, Math.ceil(estimate));

import { ExecuteTransformConfig, executeTransform } from '@aws-amplify/graphql-transformer';
import {
  DEFAULT_AUTO_STACK_RESOURCE_ESTIMATE,
  STACK_MANAGER_DEFAULT_STACK_NAME_METADATA,
  StackManagerOptions,
} from '@aws-amplify/graphql-transformer-core';
import { App, CfnResource, NestedStack, Stack } from 'aws-cdk-lib';
import { Function as LambdaFunction, IFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct, IConstruct } from 'constructs';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AssetProvider } from './asset-provider';
import {
  DEFAULT_NESTED_STACK_RESOURCE_ESTIMATE,
  DEFAULT_STACK_OPERATION_RESOURCE_BUDGET,
  GRAPHQL_API_STACK_GROUP_METADATA,
  ShardedNestedStackProvider,
  ShardedNestedStackProviderOptions,
  getTopLevelStack,
} from './nested-stack-provider';

export const CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT = 2500;
const CLOUDFORMATION_OUTPUT_SAFETY_THRESHOLD = 50;
const MAX_ADAPTIVE_PLANNING_ITERATIONS = 3;
const RESOURCE_BUDGET_ADJUSTMENT_THRESHOLD = 1.1;

export type AdaptiveStackSizingPlan = {
  nestedStackProviderOptions: ShardedNestedStackProviderOptions;
  stackManagerOptions: StackManagerOptions;
};

export type AdaptiveSizingConfig = Omit<ExecuteTransformConfig, 'assetProvider' | 'nestedStackProvider' | 'scope' | 'stackManagerOptions'>;

export type NestedStackResourceMeasurement = {
  stackName: string;
  resourceCount: number;
  defaultStackName?: string;
};

export type StackOperationResourceMeasurement = {
  operationName: string;
  resourceCount: number;
};

export type AdaptiveSizingMeasurement = {
  nestedStacks: NestedStackResourceMeasurement[];
  operations: StackOperationResourceMeasurement[];
  topLevelOutputCount?: number;
};

type PlanningTransformRunner = (
  config: AdaptiveSizingConfig,
  plan: AdaptiveStackSizingPlan,
  iteration: number,
) => AdaptiveSizingMeasurement;

type AdaptiveSizingProps = {
  runPlanningTransform?: PlanningTransformRunner;
};

export const createAdaptiveStackSizingPlan = (config: AdaptiveSizingConfig, props: AdaptiveSizingProps = {}): AdaptiveStackSizingPlan => {
  const runPlanningTransform = props.runPlanningTransform ?? runIsolatedPlanningTransform;
  let plan = createDefaultSizingPlan();

  for (let iteration = 0; iteration < MAX_ADAPTIVE_PLANNING_ITERATIONS; iteration += 1) {
    const measurement = runPlanningTransform(config, plan, iteration);
    assertNoIrreducibleNestedStack(measurement);

    const nextPlan = refineSizingPlan(plan, measurement);
    const operationOverflow = maxOperationResourceCount(measurement) > CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT;
    if (!operationOverflow && (!nextPlan.changed || iteration === MAX_ADAPTIVE_PLANNING_ITERATIONS - 1)) {
      return nextPlan.plan;
    }

    plan = nextPlan.plan;
  }

  throw new Error(
    'Unable to automatically produce a generated nested stack sizing plan under the CloudFormation 2500 resource operation limit. ' +
      'Try reducing the number of generated resources in this API or move explicit resources with stackMappings.',
  );
};

export const measureGeneratedStackOperations = (rootScope: Construct): AdaptiveSizingMeasurement => {
  const directNestedStacks = rootScope.node.children.filter(NestedStack.isNestedStack);
  const groupStacks = getGeneratedStackGroups(rootScope);
  const groupedNestedStacks = groupStacks.flatMap((groupStack) => groupStack.node.children.filter(NestedStack.isNestedStack));
  const nestedStacks = [...directNestedStacks, ...groupedNestedStacks].map(measureNestedStack);
  const operations = [
    {
      operationName: 'direct',
      resourceCount: directNestedStacks.reduce((sum, nestedStack) => sum + countCfnResources(nestedStack), 0),
    },
    ...groupStacks.map((groupStack) => ({
      operationName: groupStack.node.id,
      resourceCount: groupStack.node.children
        .filter(NestedStack.isNestedStack)
        .reduce((sum, nestedStack) => sum + countCfnResources(nestedStack), 0),
    })),
  ];

  return {
    nestedStacks,
    operations,
    topLevelOutputCount: countTopLevelCfnOutputs(rootScope),
  };
};

const runIsolatedPlanningTransform: PlanningTransformRunner = (config, plan, iteration) => {
  const planningOutdir = mkdtempSync(join(tmpdir(), 'amplify-graphql-api-sizing-'));
  try {
    const app = new App({ autoSynth: false, outdir: planningOutdir });
    const stack = new Stack(app, `GraphqlApiSizingPlanningStack${iteration}`);
    const planningScope = new Construct(stack, 'GraphqlApiSizingPlanningScope');

    executeTransform({
      ...config,
      transformersFactoryArgs: {
        ...config.transformersFactoryArgs,
        functionNameMap: cloneFunctionNameMap(planningScope, config.transformersFactoryArgs.functionNameMap),
      },
      scope: planningScope,
      nestedStackProvider: new ShardedNestedStackProvider(planningScope, plan.nestedStackProviderOptions),
      assetProvider: new AssetProvider(planningScope),
      stackManagerOptions: plan.stackManagerOptions,
      printTransformerLog: () => undefined,
    });

    return measureGeneratedStackOperations(planningScope);
  } finally {
    rmSync(planningOutdir, { recursive: true, force: true });
  }
};

const createDefaultSizingPlan = (): AdaptiveStackSizingPlan => ({
  nestedStackProviderOptions: {
    directOperationResourceBudget: DEFAULT_STACK_OPERATION_RESOURCE_BUDGET,
    groupedOperationResourceBudget: DEFAULT_STACK_OPERATION_RESOURCE_BUDGET,
    defaultNestedStackResourceEstimate: DEFAULT_NESTED_STACK_RESOURCE_ESTIMATE,
  },
  stackManagerOptions: {
    defaultStackResourceEstimateLimit: DEFAULT_AUTO_STACK_RESOURCE_ESTIMATE,
  },
});

const refineSizingPlan = (
  currentPlan: AdaptiveStackSizingPlan,
  measurement: AdaptiveSizingMeasurement,
): { plan: AdaptiveStackSizingPlan; changed: boolean } => {
  let changed = false;
  const stackResourceCountOverrides = Object.fromEntries(
    measurement.nestedStacks.map(({ stackName, resourceCount }) => [stackName, normalizeResourceEstimate(resourceCount)]),
  );
  const existingStackResourceCountOverrides = currentPlan.stackManagerOptions.stackResourceCountOverrides ?? {};
  if (
    usesGeneratedStackGroups(measurement) &&
    !resourceEstimateMapsEqual(existingStackResourceCountOverrides, stackResourceCountOverrides)
  ) {
    changed = true;
  }
  const stackResourceEstimateLimits = { ...(currentPlan.stackManagerOptions.stackResourceEstimateLimits ?? {}) };
  const defaultStackResourceEstimateLimit =
    currentPlan.stackManagerOptions.defaultStackResourceEstimateLimit ?? DEFAULT_AUTO_STACK_RESOURCE_ESTIMATE;

  measurement.nestedStacks.forEach(({ defaultStackName, resourceCount }) => {
    if (!defaultStackName) {
      return;
    }
    const currentLimit = stackResourceEstimateLimits[defaultStackName] ?? defaultStackResourceEstimateLimit;
    if (resourceCount <= currentLimit * RESOURCE_BUDGET_ADJUSTMENT_THRESHOLD) {
      return;
    }

    const adjustedLimit = Math.max(1, Math.floor((currentLimit * currentLimit) / resourceCount));
    if (adjustedLimit < currentLimit) {
      stackResourceEstimateLimits[defaultStackName] = adjustedLimit;
      changed = true;
    }
  });

  const maxOperationCount = maxOperationResourceCount(measurement);
  const nextNestedStackProviderOptions = { ...currentPlan.nestedStackProviderOptions };
  if ((measurement.topLevelOutputCount ?? 0) > CLOUDFORMATION_OUTPUT_SAFETY_THRESHOLD) {
    const topLevelOutputScale = CLOUDFORMATION_OUTPUT_SAFETY_THRESHOLD / measurement.topLevelOutputCount!;
    const directOperationBudget = normalizeResourceEstimate(
      nextNestedStackProviderOptions.directOperationResourceBudget ?? DEFAULT_STACK_OPERATION_RESOURCE_BUDGET,
    );
    const adjustedDirectOperationBudget = Math.max(1, Math.floor(directOperationBudget * topLevelOutputScale));
    if (adjustedDirectOperationBudget < directOperationBudget) {
      nextNestedStackProviderOptions.directOperationResourceBudget = adjustedDirectOperationBudget;
      changed = true;
    }
  }
  if (maxOperationCount > DEFAULT_STACK_OPERATION_RESOURCE_BUDGET) {
    const scale = DEFAULT_STACK_OPERATION_RESOURCE_BUDGET / maxOperationCount;
    const directOperationBudget = normalizeResourceEstimate(
      nextNestedStackProviderOptions.directOperationResourceBudget ?? DEFAULT_STACK_OPERATION_RESOURCE_BUDGET,
    );
    const groupedOperationBudget = normalizeResourceEstimate(
      nextNestedStackProviderOptions.groupedOperationResourceBudget ?? DEFAULT_STACK_OPERATION_RESOURCE_BUDGET,
    );
    const adjustedDirectOperationBudget = Math.max(1, Math.floor(directOperationBudget * scale));
    const adjustedGroupedOperationBudget = Math.max(1, Math.floor(groupedOperationBudget * scale));

    if (adjustedDirectOperationBudget < directOperationBudget) {
      nextNestedStackProviderOptions.directOperationResourceBudget = adjustedDirectOperationBudget;
      changed = true;
    }
    if (adjustedGroupedOperationBudget < groupedOperationBudget) {
      nextNestedStackProviderOptions.groupedOperationResourceBudget = adjustedGroupedOperationBudget;
      changed = true;
    }
  }

  return {
    changed,
    plan: {
      nestedStackProviderOptions: nextNestedStackProviderOptions,
      stackManagerOptions: {
        ...currentPlan.stackManagerOptions,
        stackResourceEstimateLimits,
        stackResourceCountOverrides,
      },
    },
  };
};

const assertNoIrreducibleNestedStack = (measurement: AdaptiveSizingMeasurement): void => {
  const oversizedNestedStack = measurement.nestedStacks.find(
    ({ resourceCount }) => resourceCount > CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT,
  );
  if (!oversizedNestedStack) {
    return;
  }

  throw new Error(
    `Generated nested stack ${oversizedNestedStack.stackName} contains ${oversizedNestedStack.resourceCount} CloudFormation resources, ` +
      `which exceeds the ${CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT} resource operation limit by itself. ` +
      'This cannot be fixed by automatic stack placement because CDK constructs cannot be safely re-parented after creation. ' +
      'Reduce the generated resources for that model/operation or split the schema.',
  );
};

const measureNestedStack = (nestedStack: NestedStack): NestedStackResourceMeasurement => ({
  stackName: nestedStack.node.id,
  resourceCount: countCfnResources(nestedStack),
  defaultStackName: getDefaultStackName(nestedStack),
});

const countCfnResources = (scope: Construct): number => {
  let resourceCount = 0;
  visitConstructTree(scope, (construct) => {
    if (construct instanceof CfnResource) {
      resourceCount += 1;
    }
  });
  return resourceCount;
};

const countTopLevelCfnOutputs = (scope: Construct): number => {
  const topLevelStack = getTopLevelStack(scope);
  const root = topLevelStack.node.root;
  try {
    if (root instanceof App) {
      root.synth();
    }
    const template = (
      topLevelStack as unknown as { _toCloudFormation?: () => { Outputs?: Record<string, unknown> } }
    )._toCloudFormation?.();
    return Object.keys(template?.Outputs ?? {}).length;
  } catch {
    return 0;
  }
};

const visitConstructTree = (scope: IConstruct, visit: (construct: IConstruct) => void): void => {
  visit(scope);
  scope.node.children.forEach((child) => visitConstructTree(child, visit));
};

const getDefaultStackName = (nestedStack: NestedStack): string | undefined => {
  const metadataEntry = nestedStack.node.metadata.find((entry) => entry.type === STACK_MANAGER_DEFAULT_STACK_NAME_METADATA);
  return typeof metadataEntry?.data === 'string' ? metadataEntry.data : undefined;
};

const getGeneratedStackGroups = (scope: Construct): Stack[] => {
  const topLevelStack = getTopLevelStack(scope);
  const stackGroupScope = (topLevelStack.node.scope ?? topLevelStack.node.root) as Construct;

  return stackGroupScope.node.children.filter(
    (child): child is Stack =>
      Stack.isStack(child) &&
      child !== topLevelStack &&
      child.node.metadata.some(
        (metadataEntry) => metadataEntry.type === GRAPHQL_API_STACK_GROUP_METADATA && metadataEntry.data === scope.node.addr,
      ),
  );
};

const maxOperationResourceCount = (measurement: AdaptiveSizingMeasurement): number =>
  Math.max(0, ...measurement.operations.map(({ resourceCount }) => resourceCount));

const usesGeneratedStackGroups = (measurement: AdaptiveSizingMeasurement): boolean =>
  measurement.operations.some(({ operationName }) => operationName !== 'direct');

const resourceEstimateMapsEqual = (left: Record<string, number>, right: Record<string, number>): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
};

const normalizeResourceEstimate = (estimate: number): number => Math.max(1, Math.ceil(estimate));

const cloneFunctionNameMap = (
  scope: Construct,
  functionNameMap: Record<string, IFunction> | undefined,
): Record<string, IFunction> | undefined => {
  if (!functionNameMap) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(functionNameMap).map(([name, fn], index) => [
      name,
      LambdaFunction.fromFunctionAttributes(scope, `Planning${index}${sanitizeConstructId(name)}Function`, {
        functionArn: fn.functionArn,
        sameEnvironment: false,
        skipPermissions: true,
      }),
    ]),
  );
};

const sanitizeConstructId = (value: string): string => value.replace(/[^A-Za-z0-9]/g, '');

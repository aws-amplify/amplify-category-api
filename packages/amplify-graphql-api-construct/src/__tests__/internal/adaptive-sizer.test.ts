import {
  CLOUDFORMATION_NESTED_STACK_RESOURCE_LIMIT,
  CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT,
  AdaptiveSizingMeasurement,
  createAdaptiveStackSizingPlan,
} from '../../internal/adaptive-sizer';

describe('adaptive stack sizing', () => {
  it('retries planning with measured stack counts when the first operation is over budget', () => {
    const firstMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: ['ModelA', 'ModelB', 'ModelC', 'ModelD', 'ModelE', 'ModelF'].map((modelName) => ({
        stackName: modelName,
        defaultStackName: modelName,
        resourceCount: 450,
        resourceTypeCounts: {},
      })),
      operations: [{ operationName: 'direct', resourceCount: 2700 }],
    };
    const secondMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: firstMeasurement.nestedStacks,
      operations: [
        { operationName: 'direct', resourceCount: 900 },
        { operationName: 'AmplifyGraphqlApiStackGroup1', resourceCount: 1800 },
      ],
      topLevelOutputCount: 150,
    };
    const thirdMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: firstMeasurement.nestedStacks,
      operations: [
        { operationName: 'direct', resourceCount: 450 },
        { operationName: 'AmplifyGraphqlApiStackGroup1', resourceCount: 900 },
        { operationName: 'AmplifyGraphqlApiStackGroup2', resourceCount: 900 },
        { operationName: 'AmplifyGraphqlApiStackGroup3', resourceCount: 450 },
      ],
    };
    const runPlanningTransform = jest
      .fn()
      .mockReturnValueOnce(firstMeasurement)
      .mockReturnValueOnce(secondMeasurement)
      .mockReturnValueOnce(thirdMeasurement);

    const plan = createAdaptiveStackSizingPlan({} as any, { runPlanningTransform });

    expect(runPlanningTransform).toHaveBeenCalledTimes(3);
    expect(plan.stackManagerOptions.stackResourceCountOverrides).toMatchObject({
      ModelA: 450,
      ModelB: 450,
      ModelC: 450,
      ModelD: 450,
      ModelE: 450,
      ModelF: 450,
    });
    expect(plan.nestedStackProviderOptions.groupAllRootNestedStacks).toBeUndefined();
    expect(plan.nestedStackProviderOptions.directOperationResourceBudget).toBeLessThan(2000);
    expect(plan.nestedStackProviderOptions.groupedOperationResourceBudget).toBeLessThan(2000);
  });

  it('reduces direct root stack placement once top-level generated outputs need headroom', () => {
    const directOnlyMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: ['ModelA', 'ModelB', 'ModelC', 'ModelD', 'ModelE', 'ModelF'].map((modelName) => ({
        stackName: modelName,
        defaultStackName: modelName,
        resourceCount: 450,
        resourceTypeCounts: {},
      })),
      operations: [{ operationName: 'direct', resourceCount: 2700 }],
    };
    const shardedMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: directOnlyMeasurement.nestedStacks,
      operations: [
        { operationName: 'direct', resourceCount: 900 },
        { operationName: 'AmplifyGraphqlApiStackGroup1', resourceCount: 1800 },
      ],
      topLevelOutputCount: 150,
    };
    const outputSafeMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: directOnlyMeasurement.nestedStacks,
      operations: [
        { operationName: 'direct', resourceCount: 450 },
        { operationName: 'AmplifyGraphqlApiStackGroup1', resourceCount: 900 },
        { operationName: 'AmplifyGraphqlApiStackGroup2', resourceCount: 900 },
        { operationName: 'AmplifyGraphqlApiStackGroup3', resourceCount: 450 },
      ],
    };
    const runPlanningTransform = jest
      .fn()
      .mockReturnValueOnce(directOnlyMeasurement)
      .mockImplementationOnce((_config, plan) => {
        expect(plan.nestedStackProviderOptions.groupAllRootNestedStacks).toBeUndefined();
        return shardedMeasurement;
      })
      .mockImplementationOnce((_config, plan) => {
        expect(plan.nestedStackProviderOptions.groupAllRootNestedStacks).toBeUndefined();
        expect(plan.nestedStackProviderOptions.directOperationResourceBudget).toBeLessThan(2000);
        return outputSafeMeasurement;
      });

    const plan = createAdaptiveStackSizingPlan({} as any, { runPlanningTransform });

    expect(runPlanningTransform).toHaveBeenCalledTimes(3);
    expect(plan.nestedStackProviderOptions.groupAllRootNestedStacks).toBeUndefined();
    expect(plan.nestedStackProviderOptions.directOperationResourceBudget).toBeLessThan(2000);
  });

  it('fails with an actionable error when one nested stack is irreducibly over the hard limit', () => {
    const runPlanningTransform = jest.fn().mockReturnValue({
      nestedStacks: [
        {
          stackName: 'OversizedModel',
          defaultStackName: 'OversizedModel',
          resourceCount: CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT + 1,
          resourceTypeCounts: {},
        },
      ],
      operations: [{ operationName: 'direct', resourceCount: CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT + 1 }],
    } satisfies AdaptiveSizingMeasurement);

    expect(() => createAdaptiveStackSizingPlan({} as any, { runPlanningTransform })).toThrow(
      /OversizedModel.*cannot be fixed by automatic stack placement/,
    );
  });

  it('fails when any generated nested stack remains over the 500 resource nested stack limit', () => {
    const runPlanningTransform = jest.fn().mockReturnValue({
      nestedStacks: [
        {
          stackName: 'LargeModel',
          defaultStackName: 'LargeModel',
          resourceCount: CLOUDFORMATION_NESTED_STACK_RESOURCE_LIMIT + 1,
          resourceTypeCounts: {
            'AWS::AppSync::Resolver': CLOUDFORMATION_NESTED_STACK_RESOURCE_LIMIT + 1,
          },
        },
      ],
      operations: [{ operationName: 'direct', resourceCount: CLOUDFORMATION_NESTED_STACK_RESOURCE_LIMIT + 1 }],
    } satisfies AdaptiveSizingMeasurement);

    expect(() => createAdaptiveStackSizingPlan({} as any, { runPlanningTransform })).toThrow(
      /LargeModel.*501.*500 resource nested stack limit/,
    );
  });

  it('continues planning when oversized stacks can be split by reducing the resource estimate budget', () => {
    const oversizedMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: [
        {
          stackName: 'ModelA',
          defaultStackName: 'ModelA',
          resourceCount: 650,
          resourceTypeCounts: { 'AWS::AppSync::Resolver': 650 },
        },
      ],
      operations: [{ operationName: 'direct', resourceCount: 650 }],
    };
    const splitMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: [
        {
          stackName: 'ModelA',
          defaultStackName: 'ModelA',
          resourceCount: 325,
          resourceTypeCounts: { 'AWS::AppSync::Resolver': 325 },
        },
        {
          stackName: 'ModelA2',
          defaultStackName: 'ModelA',
          resourceCount: 325,
          resourceTypeCounts: { 'AWS::AppSync::Resolver': 325 },
        },
      ],
      operations: [{ operationName: 'direct', resourceCount: 650 }],
    };
    const runPlanningTransform = jest.fn().mockReturnValueOnce(oversizedMeasurement).mockReturnValueOnce(splitMeasurement);

    const plan = createAdaptiveStackSizingPlan({} as any, { runPlanningTransform });

    expect(runPlanningTransform).toHaveBeenCalledTimes(2);
    expect(plan.stackManagerOptions.stackResourceEstimateLimits?.ModelA).toBeLessThan(400);
  });

  it('fails with an actionable error when pinned @function AppSync resources leave no nested stack headroom', () => {
    const runPlanningTransform = jest.fn().mockReturnValue({
      nestedStacks: [
        {
          stackName: 'FunctionDirectiveStack',
          defaultStackName: 'FunctionDirectiveStack',
          resourceCount: 500,
          resourceTypeCounts: {
            'AWS::AppSync::DataSource': 125,
            'AWS::AppSync::FunctionConfiguration': 250,
            'AWS::AppSync::Resolver': 125,
          },
        },
      ],
      operations: [{ operationName: 'direct', resourceCount: 500 }],
    } satisfies AdaptiveSizingMeasurement);

    expect(() => createAdaptiveStackSizingPlan({} as any, { runPlanningTransform })).toThrow(
      /pinned AppSync resources.*Automatic sharding cannot safely move AppSync.*explicit migration flow.*non-production/s,
    );
  });
});

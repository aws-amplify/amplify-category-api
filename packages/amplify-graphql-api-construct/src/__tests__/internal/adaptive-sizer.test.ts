import {
  CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT,
  AdaptiveSizingMeasurement,
  createAdaptiveStackSizingPlan,
} from '../../internal/adaptive-sizer';

describe('adaptive stack sizing', () => {
  it('retries planning with measured stack counts when the first operation is over budget', () => {
    const firstMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: [
        { stackName: 'ModelA', defaultStackName: 'ModelA', resourceCount: 1200 },
        { stackName: 'ModelB', defaultStackName: 'ModelB', resourceCount: 1200 },
        { stackName: 'ModelC', defaultStackName: 'ModelC', resourceCount: 1200 },
      ],
      operations: [{ operationName: 'direct', resourceCount: 3600 }],
    };
    const secondMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: firstMeasurement.nestedStacks,
      operations: [
        { operationName: 'direct', resourceCount: 1200 },
        { operationName: 'AmplifyGraphqlApiStackGroup1', resourceCount: 2400 },
      ],
    };
    const thirdMeasurement: AdaptiveSizingMeasurement = {
      nestedStacks: firstMeasurement.nestedStacks,
      operations: [
        { operationName: 'direct', resourceCount: 1200 },
        { operationName: 'AmplifyGraphqlApiStackGroup1', resourceCount: 1200 },
        { operationName: 'AmplifyGraphqlApiStackGroup2', resourceCount: 1200 },
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
      ModelA: 1200,
      ModelB: 1200,
      ModelC: 1200,
    });
    expect(plan.nestedStackProviderOptions.directOperationResourceBudget).toBeLessThan(2000);
    expect(plan.nestedStackProviderOptions.groupedOperationResourceBudget).toBeLessThan(2000);
  });

  it('fails with an actionable error when one nested stack is irreducibly over the hard limit', () => {
    const runPlanningTransform = jest.fn().mockReturnValue({
      nestedStacks: [
        {
          stackName: 'OversizedModel',
          defaultStackName: 'OversizedModel',
          resourceCount: CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT + 1,
        },
      ],
      operations: [{ operationName: 'direct', resourceCount: CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT + 1 }],
    } satisfies AdaptiveSizingMeasurement);

    expect(() => createAdaptiveStackSizingPlan({} as any, { runPlanningTransform })).toThrow(
      /OversizedModel.*cannot be fixed by automatic stack placement/,
    );
  });
});

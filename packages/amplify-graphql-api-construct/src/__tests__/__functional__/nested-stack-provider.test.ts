import { App, CfnParameter, CfnResource, NestedStack, Stack } from 'aws-cdk-lib';
import { GRAPHQL_API_STACK_GROUP_METADATA, ShardedNestedStackProvider } from '../../internal/nested-stack-provider';

const ESTIMATED_RESOURCES_PER_GENERATED_NESTED_STACK = 400;
const CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT = 2500;

describe('ShardedNestedStackProvider', () => {
  it('keeps generated stack groups below CloudFormation template and operation budgets', () => {
    const app = new App();
    const stack = new Stack(app, 'RootStack');
    const provider = new ShardedNestedStackProvider(stack);

    for (let index = 0; index < 22; index += 1) {
      provider.provide(stack, `GeneratedNestedStack${index}`);
    }

    const directNestedStacks = stack.node.children.filter(NestedStack.isNestedStack);
    const groupStacks = app.node.children.filter(
      (child): child is Stack =>
        Stack.isStack(child) &&
        child.node.metadata.some(
          (metadataEntry) => metadataEntry.type === GRAPHQL_API_STACK_GROUP_METADATA && metadataEntry.data === stack.node.addr,
        ),
    );
    const [group1, group2, group3, group4] = groupStacks;

    expect(directNestedStacks).toHaveLength(5);
    expect(groupStacks).toHaveLength(4);
    expect(group1).toBeDefined();
    expect(group4).toBeDefined();
    expect(group1!.node.children.filter(NestedStack.isNestedStack)).toHaveLength(5);
    expect(group4!.node.children.filter(NestedStack.isNestedStack)).toHaveLength(2);
    expect(group1!.dependencies).toEqual(expect.arrayContaining([stack]));
    expect(group2!.dependencies).toEqual(expect.arrayContaining([stack, group1]));
    expect(group3!.dependencies).toEqual(expect.arrayContaining([stack, group2]));
    expect(group4!.dependencies).toEqual(expect.arrayContaining([stack, group3]));
    expect(group1!.node.tryFindChild('DynamoDBModelTableReadIOPS')).toBeInstanceOf(CfnParameter);
    expect(group1!.node.tryFindChild('DynamoDBModelTableWriteIOPS')).toBeInstanceOf(CfnParameter);
    expect(group1!.node.tryFindChild('DynamoDBBillingMode')).toBeInstanceOf(CfnParameter);
    expect(group1!.node.tryFindChild('DynamoDBEnablePointInTimeRecovery')).toBeInstanceOf(CfnParameter);
    expect(group1!.node.tryFindChild('DynamoDBEnableServerSideEncryption')).toBeInstanceOf(CfnParameter);
  });

  it('moves overflow nested stacks into separate stack operations before the 2500 resource operation limit', () => {
    const app = new App();
    const stack = new Stack(app, 'RootStack');
    const provider = new ShardedNestedStackProvider(stack);
    const nestedStackCountThatWouldOverflowOneOperation = 12;

    for (let stackIndex = 0; stackIndex < nestedStackCountThatWouldOverflowOneOperation; stackIndex += 1) {
      const nestedStack = provider.provide(stack, `GeneratedNestedStack${stackIndex}`);

      for (let resourceIndex = 0; resourceIndex < ESTIMATED_RESOURCES_PER_GENERATED_NESTED_STACK; resourceIndex += 1) {
        new CfnResource(nestedStack, `Resource${resourceIndex}`, {
          type: 'Custom::GeneratedResource',
        });
      }
    }

    const groupStacks = app.node.children.filter(
      (child): child is Stack =>
        Stack.isStack(child) &&
        child.node.metadata.some(
          (metadataEntry) => metadataEntry.type === GRAPHQL_API_STACK_GROUP_METADATA && metadataEntry.data === stack.node.addr,
        ),
    );
    const operationNestedStackCounts = [
      stack.node.children.filter(NestedStack.isNestedStack).length,
      ...groupStacks.map((groupStack) => groupStack.node.children.filter(NestedStack.isNestedStack).length),
    ];
    const operationResourceEstimates = operationNestedStackCounts.map(
      (nestedStackCount) => nestedStackCount * ESTIMATED_RESOURCES_PER_GENERATED_NESTED_STACK,
    );
    const ungroupedResourceEstimate = nestedStackCountThatWouldOverflowOneOperation * ESTIMATED_RESOURCES_PER_GENERATED_NESTED_STACK;

    expect(ungroupedResourceEstimate).toBeGreaterThan(CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT);
    expect(Math.max(...operationResourceEstimates)).toBe(5 * ESTIMATED_RESOURCES_PER_GENERATED_NESTED_STACK);
    expect(Math.max(...operationResourceEstimates)).toBeLessThan(CLOUDFORMATION_STACK_OPERATION_RESOURCE_LIMIT);
    expect(groupStacks).toHaveLength(2);
  });
});

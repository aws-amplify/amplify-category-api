import { App, CfnParameter, NestedStack, Stack } from 'aws-cdk-lib';
import { GRAPHQL_API_STACK_GROUP_METADATA, ShardedNestedStackProvider } from '../../internal/nested-stack-provider';

describe('ShardedNestedStackProvider', () => {
  it('keeps generated stack groups below CloudFormation template and operation budgets', () => {
    const app = new App();
    const stack = new Stack(app, 'RootStack');
    const provider = new ShardedNestedStackProvider(stack);

    for (let index = 0; index < 205; index += 1) {
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

    expect(directNestedStacks).toHaveLength(50);
    expect(groupStacks).toHaveLength(4);
    expect(group1).toBeDefined();
    expect(group4).toBeDefined();
    expect(group1!.node.children.filter(NestedStack.isNestedStack)).toHaveLength(50);
    expect(group4!.node.children.filter(NestedStack.isNestedStack)).toHaveLength(5);
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
});

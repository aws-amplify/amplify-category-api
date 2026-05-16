import { CfnParameter, NestedStack, Stack } from 'aws-cdk-lib';
import { ShardedNestedStackProvider } from '../../internal/nested-stack-provider';

describe('ShardedNestedStackProvider', () => {
  it('keeps generated nested stack declarations below the parent template budget', () => {
    const stack = new Stack();
    const provider = new ShardedNestedStackProvider(stack);

    for (let index = 0; index < 205; index += 1) {
      provider.provide(stack, `GeneratedNestedStack${index}`);
    }

    const directNestedStacks = stack.node.children.filter(NestedStack.isNestedStack);
    const group1 = directNestedStacks.find((nestedStack) => nestedStack.node.id === 'AmplifyGraphqlApiStackGroup1');
    const group5 = directNestedStacks.find((nestedStack) => nestedStack.node.id === 'AmplifyGraphqlApiStackGroup5');

    expect(directNestedStacks).toHaveLength(55);
    expect(group1).toBeDefined();
    expect(group5).toBeDefined();
    expect(group1!.node.children.filter(NestedStack.isNestedStack)).toHaveLength(50);
    expect(group5!.node.children.filter(NestedStack.isNestedStack)).toHaveLength(5);
    expect(group1!.node.tryFindChild('DynamoDBModelTableReadIOPS')).toBeInstanceOf(CfnParameter);
    expect(group1!.node.tryFindChild('DynamoDBModelTableWriteIOPS')).toBeInstanceOf(CfnParameter);
    expect(group1!.node.tryFindChild('DynamoDBBillingMode')).toBeInstanceOf(CfnParameter);
    expect(group1!.node.tryFindChild('DynamoDBEnablePointInTimeRecovery')).toBeInstanceOf(CfnParameter);
    expect(group1!.node.tryFindChild('DynamoDBEnableServerSideEncryption')).toBeInstanceOf(CfnParameter);
  });
});

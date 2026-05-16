import { NestedStack, Stack } from 'aws-cdk-lib';
import { CfnGraphQLApi, CfnGraphQLSchema } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import { getGeneratedResources } from '../../internal/construct-exports';

describe('getGeneratedResources', () => {
  it('returns nested stacks from generated stack groups', () => {
    const stack = new Stack();
    const scope = new Construct(stack, 'GeneratedApi');
    const directStack = new NestedStack(scope, 'DirectGeneratedStack');
    const groupedStackParent = new NestedStack(scope, 'AmplifyGraphqlApiStackGroup1');
    const groupedStack = new NestedStack(groupedStackParent, 'GroupedGeneratedStack');

    new CfnGraphQLApi(scope, 'GraphQLApi', {
      authenticationType: 'API_KEY',
      name: 'test-api',
    });
    new CfnGraphQLSchema(scope, 'GraphQLSchema', {
      apiId: 'test-api-id',
      definition: 'type Query { noop: String }',
    });

    const resources = getGeneratedResources(scope);

    expect(resources.nestedStacks.DirectGeneratedStack).toBe(directStack);
    expect(resources.nestedStacks.AmplifyGraphqlApiStackGroup1).toBe(groupedStackParent);
    expect(resources.nestedStacks.GroupedGeneratedStack).toBe(groupedStack);
  });
});


import { App, CfnResource, NestedStack, Stack } from 'aws-cdk-lib';
import { CfnGraphQLApi, CfnGraphQLSchema } from 'aws-cdk-lib/aws-appsync';
import { setResourceName } from '@aws-amplify/graphql-transformer-core';
import { Construct } from 'constructs';
import { getGeneratedResources } from '../../internal/construct-exports';
import { GRAPHQL_API_STACK_GROUP_METADATA } from '../../internal/nested-stack-provider';

describe('getGeneratedResources', () => {
  it('returns nested stacks from generated stack groups', () => {
    const app = new App();
    const stack = new Stack(app, 'RootStack');
    const scope = new Construct(stack, 'GeneratedApi');
    const directStack = new NestedStack(scope, 'DirectGeneratedStack');
    const groupedStackParent = new Stack(app, 'AmplifyGraphqlApiStackGroup1');
    groupedStackParent.node.addMetadata(GRAPHQL_API_STACK_GROUP_METADATA, scope.node.addr);
    const groupedStack = new NestedStack(groupedStackParent, 'GroupedGeneratedStack');
    const groupedResource = new CfnResource(groupedStack, 'GroupedResource', {
      type: 'Custom::GroupedResource',
    });
    setResourceName(groupedResource, { name: 'GroupedResource' });

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
    expect(resources.nestedStacks.GroupedGeneratedStack).toBe(groupedStack);
    expect(resources.cfnResources.additionalCfnResources.GroupedResource).toBe(groupedResource);
  });
});

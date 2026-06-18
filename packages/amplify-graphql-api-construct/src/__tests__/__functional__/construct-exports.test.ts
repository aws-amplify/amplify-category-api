import { App, CfnOutput, CfnResource, NestedStack, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CfnGraphQLApi, CfnGraphQLSchema } from 'aws-cdk-lib/aws-appsync';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { setResourceName } from '@aws-amplify/graphql-transformer-core';
import { Construct } from 'constructs';
import { getGeneratedResources } from '../../internal/construct-exports';
import { GRAPHQL_API_STACK_GROUP_METADATA } from '../../internal/generated-stack-helpers';

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

  it('returns reference-safe imported table references for generated tables outside the root stack', () => {
    const app = new App();
    const stack = new Stack(app, 'RootStack');
    const scope = new Construct(stack, 'GeneratedApi');
    const directStack = new NestedStack(scope, 'DirectGeneratedStack');
    const groupedStackParent = new Stack(app, 'AmplifyGraphqlApiStackGroup1');
    groupedStackParent.node.addMetadata(GRAPHQL_API_STACK_GROUP_METADATA, scope.node.addr);
    groupedStackParent.addDependency(stack);
    const groupedStack = new NestedStack(groupedStackParent, 'GroupedGeneratedStack');

    const directTable = new Table(directStack, 'DirectModelTable', {
      tableName: 'DirectModel-testapi-NONE',
      partitionKey: { name: 'id', type: AttributeType.STRING },
    });
    setResourceName(directTable, { name: 'DirectModel', setOnDefaultChild: true });

    const groupedTable = new Table(groupedStack, 'GroupedModelTable', {
      tableName: 'GroupedModel-testapi-NONE',
      partitionKey: { name: 'id', type: AttributeType.STRING },
    });
    setResourceName(groupedTable, { name: 'GroupedModel', setOnDefaultChild: true });

    new CfnGraphQLApi(scope, 'GraphQLApi', {
      authenticationType: 'API_KEY',
      name: 'test-api',
    });
    new CfnGraphQLSchema(scope, 'GraphQLSchema', {
      apiId: 'test-api-id',
      definition: 'type Query { noop: String }',
    });

    const resources = getGeneratedResources(scope);
    const grantRole = new Role(stack, 'GrantRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    new CfnOutput(stack, 'DirectTableName', {
      value: resources.tables.DirectModel.tableName,
    });
    new CfnOutput(stack, 'GroupedTableName', {
      value: resources.tables.GroupedModel.tableName,
    });
    resources.tables.GroupedModel.grantReadWriteData(grantRole);

    const rootTemplateText = JSON.stringify(Template.fromStack(stack).toJSON());
    const directNestedTemplate = Template.fromStack(directStack).toJSON();
    const groupedNestedTemplate = Template.fromStack(groupedStack).toJSON();

    expect(resources.tables.DirectModel).not.toBe(directTable);
    expect(resources.tables.GroupedModel).not.toBe(groupedTable);
    expect(rootTemplateText).toContain('DirectModel-testapi-NONE');
    expect(rootTemplateText).toContain('table/GroupedModel-testapi-NONE');
    expect(rootTemplateText).toContain('table/GroupedModel-testapi-NONE/index/*');
    expect(rootTemplateText).not.toContain('GroupedGeneratedStack');
    expect(rootTemplateText).not.toContain('Outputs.');
    expect(Object.keys(directNestedTemplate.Outputs ?? {})).toHaveLength(0);
    expect(Object.keys(groupedNestedTemplate.Outputs ?? {})).toHaveLength(0);
  });
});

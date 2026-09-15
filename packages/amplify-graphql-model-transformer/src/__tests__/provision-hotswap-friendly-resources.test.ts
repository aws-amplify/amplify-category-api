import { App, Stack } from 'aws-cdk-lib';
import { SQLLambdaResourceNames } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { createLayerVersionCustomResource, createSNSTopicARNCustomResource } from '../resolvers/rds';

describe('provisionHotswapFriendlyResources', () => {
  const resourceNames = {
    sqlLayerVersionResolverCustomResource: 'TestLayerVersionCustomResource',
    sqlSNSTopicARNResolverCustomResource: 'TestSNSTopicARNCustomResource',
  } as SQLLambdaResourceNames;
  const contextToProvideHotswapFriendlyResources = {
    synthParameters: {
      amplifyEnvironmentName: 'testAmplifyEnvironmentName',
      apiName: 'testAPIName',
      provisionHotswapFriendlyResources: true,
    },
  } as TransformerContextProvider;
  const contextToNotProvideHotswapFriendlyResources = {
    synthParameters: {
      amplifyEnvironmentName: 'testAmplifyEnvironmentName',
      apiName: 'testAPIName',
      provisionHotswapFriendlyResources: false,
    },
  } as TransformerContextProvider;
  const layerVersionCustomResourceType = 'Custom::SQLLayerVersionCustomResource';
  const snsTopicARNCustomResourceType = 'Custom::SQLSNSTopicARNCustomResource';

  let app: App;
  let stack: Stack;
  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
  });

  it('should create a layer version custom resource with a fixed physical ID if provisionHotswapFriendlyResources is true', () => {
    createLayerVersionCustomResource(stack, resourceNames, contextToProvideHotswapFriendlyResources);

    // Synthesize stack to get CFN template
    const synthesizedTemplate = app.synth().getStackByName(stack.stackName).template;
    const resources = synthesizedTemplate.Resources;

    // Find custom resource
    const customResource = Object.values(resources).find((resource: any) => resource.Type === layerVersionCustomResourceType) as any;

    // Expect custom resource to be defined
    expect(customResource).toBeDefined();

    // Parse 'Create' and 'Update' properties to extract physicalResourceId
    const createProperties = JSON.parse(customResource.Properties.Create['Fn::Join'][1].join(''));
    const updateProperties = JSON.parse(customResource.Properties.Update['Fn::Join'][1].join(''));

    const expectedPhysicalId = resourceNames.sqlLayerVersionResolverCustomResource;
    expect(createProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
    expect(updateProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
  });

  it('should create a SNS topic ARN custom resource with a fixed physical ID if provisionHotswapFriendlyResources is true', () => {
    createSNSTopicARNCustomResource(stack, resourceNames, contextToProvideHotswapFriendlyResources);

    // Synthesize stack to get CFN template
    const synthesizedTemplate = app.synth().getStackByName(stack.stackName).template;
    const resources = synthesizedTemplate.Resources;

    // Find custom resource
    const customResource = Object.values(resources).find((resource: any) => resource.Type === snsTopicARNCustomResourceType) as any;

    // Expect custom resource to be defined
    expect(customResource).toBeDefined();

    // Parse 'Create' and 'Update' properties to extract physicalResourceId
    const createProperties = JSON.parse(customResource.Properties.Create['Fn::Join'][1].join(''));
    const updateProperties = JSON.parse(customResource.Properties.Update['Fn::Join'][1].join(''));

    const expectedPhysicalId = resourceNames.sqlSNSTopicARNResolverCustomResource;
    expect(createProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
    expect(updateProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
  });

  it('should create a layer version custom resource with a unique physical ID if provisionHotswapFriendlyResources is false', () => {
    createLayerVersionCustomResource(stack, resourceNames, contextToNotProvideHotswapFriendlyResources);

    // Synthesize stack to get CFN template
    const synthesizedTemplate = app.synth().getStackByName(stack.stackName).template;
    const resources = synthesizedTemplate.Resources;

    // Find custom resource
    const customResource = Object.values(resources).find((resource: any) => resource.Type === layerVersionCustomResourceType) as any;

    // Expect custom resource to be defined
    expect(customResource).toBeDefined();

    // Parse 'Create' and 'Update' properties to extract physicalResourceId
    const createProperties = JSON.parse(customResource.Properties.Create['Fn::Join'][1].join(''));
    const updateProperties = JSON.parse(customResource.Properties.Update['Fn::Join'][1].join(''));

    const expectedPhysicalId = new RegExp(`^${resourceNames.sqlLayerVersionResolverCustomResource}-\\d{13,}$`);
    expect(createProperties.physicalResourceId.id).toMatch(expectedPhysicalId);
    expect(updateProperties.physicalResourceId.id).toMatch(expectedPhysicalId);
  });

  it('should create a SNS topic ARN custom resource with a unique physical ID if provisionHotswapFriendlyResources is false', () => {
    createSNSTopicARNCustomResource(stack, resourceNames, contextToNotProvideHotswapFriendlyResources);

    // Synthesize stack to get CFN template
    const synthesizedTemplate = app.synth().getStackByName(stack.stackName).template;
    const resources = synthesizedTemplate.Resources;

    // Find custom resource
    const customResource = Object.values(resources).find((resource: any) => resource.Type === snsTopicARNCustomResourceType) as any;

    // Expect custom resource to be defined
    expect(customResource).toBeDefined();

    // Parse 'Create' and 'Update' properties to extract physicalResourceId
    const createProperties = JSON.parse(customResource.Properties.Create['Fn::Join'][1].join(''));
    const updateProperties = JSON.parse(customResource.Properties.Update['Fn::Join'][1].join(''));

    const expectedPhysicalId = new RegExp(`^${resourceNames.sqlSNSTopicARNResolverCustomResource}-\\d{13,}$`);
    expect(createProperties.physicalResourceId.id).toMatch(expectedPhysicalId);
    expect(updateProperties.physicalResourceId.id).toMatch(expectedPhysicalId);
  });
});

import { App, Stack } from 'aws-cdk-lib';
import { SQLLambdaResourceNames } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { createLayerVersionCustomResource, createSNSTopicARNCustomResource } from '../resolvers/rds/resolver';

describe('CustomResources', () => {
  const resourceNames = {
    sqlLayerVersionResolverCustomResource: 'TestLayerVersionCustomResource',
    sqlSNSTopicARNResolverCustomResource: 'TestSNSTopicARNCustomResource',
  } as SQLLambdaResourceNames;
  const sandboxContext = {
    synthParameters: {
      amplifyEnvironmentName: 'testAmplifyEnvironmentName',
      apiName: 'testAPIName',
      deploymentIdentifier: {
        deploymentType: 'sandbox',
        namespace: 'testNamespace',
        name: 'testSandboxName',
      },
    },
  } as TransformerContextProvider;
  const branchContext = {
    synthParameters: {
      amplifyEnvironmentName: 'testAmplifyEnvironmentName',
      apiName: 'testAPIName',
      deploymentIdentifier: {
        deploymentType: 'branch',
        namespace: 'testNamespace',
        name: 'testBranchName',
      },
    },
  } as TransformerContextProvider;
  const layerVersionCustomResourceType = 'Custom::SQLLayerVersionCustomResource';
  const snsTopicARNCustomResourceType = 'Custom::SQLSNSTopicARNCustomResource';
  const layerVersionCustomResourceIdRegex = new RegExp('^TestLayerVersionCustomResource-\\d{13}$');
  const snsTopicARNCustomResourceIdRegex = new RegExp('^TestSNSTopicARNCustomResource-\\d{13}$');

  let app: App;
  let stack: Stack;
  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
  });

  // --------------------------------------------------
  // Tests for sandbox deployment
  // --------------------------------------------------

  it('should create a layer version custom resource with fixed physical ID for sandbox deployment', () => {
    createLayerVersionCustomResource(stack, resourceNames, sandboxContext);

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

    const expectedPhysicalId = 'TestLayerVersionCustomResource';
    expect(createProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
    expect(updateProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
  });

  it('should create a SNS topic ARN custom resource with fixed physical ID for sandbox deployment', () => {
    createSNSTopicARNCustomResource(stack, resourceNames, sandboxContext);

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

    const expectedPhysicalId = 'TestSNSTopicARNCustomResource';
    expect(createProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
    expect(updateProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
  });

  // --------------------------------------------------
  // Tests for branch deployment
  // --------------------------------------------------
  it('should create a layer version custom resource with a unique physical ID for branch deployment', () => {
    createLayerVersionCustomResource(stack, resourceNames, branchContext);

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

    expect(createProperties.physicalResourceId.id).toMatch(layerVersionCustomResourceIdRegex);
    expect(updateProperties.physicalResourceId.id).toMatch(layerVersionCustomResourceIdRegex);
  });

  it('should create a SNS topic ARN custom resource with a unique physical ID for branch deployment', () => {
    createSNSTopicARNCustomResource(stack, resourceNames, branchContext);

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

    expect(createProperties.physicalResourceId.id).toMatch(snsTopicARNCustomResourceIdRegex);
    expect(updateProperties.physicalResourceId.id).toMatch(snsTopicARNCustomResourceIdRegex);
  });
});

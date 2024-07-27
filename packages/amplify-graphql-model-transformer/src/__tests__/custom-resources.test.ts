import {
    createLayerVersionCustomResource,
    createSNSTopicARNCustomResource,
} from '@aws-amplify/graphql-model-transformer';
import { App, Stack } from 'aws-cdk-lib';
import { SQLLambdaResourceNames } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';

describe('CustomResources', () => {
    const resourceNames = {
        sqlLayerVersionResolverCustomResource: 'TestLayerVersionCustomResource',
        sqlSNSTopicARNResolverCustomResource: 'TestSNSTopicARNCustomResource'
    } as SQLLambdaResourceNames;
    const context = {
        deploymentIdentifier: {
            deploymentType: 'sandbox'
        }
    } as TransformerContextProvider;
    const layerVersionCustomResourceType = 'Custom::SQLLayerVersionCustomResource';
    const snsTopicARNCustomResourceType = 'Custom::SQLSNSTopicARNCustomResource';

    let app: App;
    let stack: Stack;
    beforeEach(() => {
        app = new App();
        stack = new Stack(app, 'TestStack');
    });

    it('should create a layer version custom resource with correct physical ID format for sandbox deployment', () => {
        createLayerVersionCustomResource(stack, resourceNames, context);

        // Synthesize stack to get CFN template
        const synthesizedTemplate = app.synth().getStackByName(stack.stackName).template;
        const resources = synthesizedTemplate.Resources;

        // Find custom resource
        const customResource = Object.values(resources).find(
            (resource: any) => resource.Type === layerVersionCustomResourceType
        ) as any;

        // Expect custom resource to be defined
        expect(customResource).toBeDefined();

        // Parse 'Create' and 'Update' properties to extract physicalResourceId
        const createProperties = JSON.parse(customResource.Properties.Create['Fn::Join'][1].join(''));
        const updateProperties = JSON.parse(customResource.Properties.Update['Fn::Join'][1].join(''));

        const expectedPhysicalId = `TestLayerVersionCustomResource-${new Date().toISOString().substring(0, 10)}`;
        expect(createProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
        expect(updateProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
    });

    it('should create a SNS topic ARN custom resource with correct physical ID format for sandbox deployment', () => {
        createSNSTopicARNCustomResource(stack, resourceNames, context);

        // Synthesize stack to get CFN template
        const synthesizedTemplate = app.synth().getStackByName(stack.stackName).template;
        const resources = synthesizedTemplate.Resources;

        // Find custom resource
        const customResource = Object.values(resources).find(
            (resource: any) => resource.Type === snsTopicARNCustomResourceType
        ) as any;

        // Expect custom resource to be defined
        expect(customResource).toBeDefined();

        // Parse 'Create' and 'Update' properties to extract physicalResourceId
        const createProperties = JSON.parse(customResource.Properties.Create['Fn::Join'][1].join(''));
        const updateProperties = JSON.parse(customResource.Properties.Update['Fn::Join'][1].join(''));

        const expectedPhysicalId = `TestSNSTopicARNCustomResource-${new Date().toISOString().substring(0, 10)}`;
        expect(createProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
        expect(updateProperties.physicalResourceId.id).toEqual(expectedPhysicalId);
    });
})

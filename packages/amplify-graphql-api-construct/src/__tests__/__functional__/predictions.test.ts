import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

/**
 * Utility to wrap construct creation a basic synth step to smoke test
 * @param buildApp callback to create the resources in the stack
 */
const verifySynth = (buildApp: (stack: cdk.Stack) => void): void => {
  const stack = new cdk.Stack();
  buildApp(stack);
  Template.fromStack(stack);
};

describe('predictions category', () => {
  it('synths with predictions config', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Query {
            recognizeTextFromImage: String @predictions(actions: [identifyText])
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        predictionsBucket: s3.Bucket.fromBucketName(stack, 'PredictionsBucket', 'predictions-bucket'),
      });
    });
  });

  it('generates a nested stack for predictions directive', () => {
    const stack = new cdk.Stack();
    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Query {
          recognizeTextFromImage: String @predictions(actions: [identifyText])
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
      predictionsBucket: new s3.Bucket(stack, 'PredictionsBucket'),
    });

    expect(api.resources.nestedStacks.PredictionsDirectiveStack).toBeDefined();
    const predictionsTemplate = Template.fromStack(api.resources.nestedStacks.PredictionsDirectiveStack);
    expect(predictionsTemplate).toBeDefined();
  });

  it('generates a resolver and iam policy without fn::sub when a real bucket is passed in', () => {
    const stack = new cdk.Stack();
    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Query {
          recognizeTextFromImage: String @predictions(actions: [identifyText])
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
      predictionsBucket: new s3.Bucket(stack, 'PredictionsBucket'),
    });

    expect(api.resources.nestedStacks.PredictionsDirectiveStack).toBeDefined();
    const predictionsTemplate = Template.fromStack(api.resources.nestedStacks.PredictionsDirectiveStack);
    expect(predictionsTemplate).toBeDefined();

    predictionsTemplate.resourceCountIs('AWS::AppSync::Resolver', 1);

    const resolver = predictionsTemplate.findResources('AWS::AppSync::Resolver').QueryrecognizeTextFromImageResolver;
    const requestMappingTemplate = JSON.stringify(resolver.Properties.RequestMappingTemplate, null, 2);
    expect(requestMappingTemplate).toMatchSnapshot();
    expect(requestMappingTemplate).not.toMatch(/Fn::Sub/);

    predictionsTemplate.resourcePropertiesCountIs(
      'AWS::IAM::Policy',
      {
        PolicyDocument: {
          Statement: Match.arrayWith([Match.objectLike({ Action: 's3:GetObject' })]),
        },
      },
      1,
    );

    const policies = predictionsTemplate.findResources('AWS::IAM::Policy');

    const storageAccessPolicyId = Object.keys(policies).filter((policyId) => policyId.match(/PredictionsStorageAccess/))[0];
    const storageAccessPolicy = JSON.stringify(policies[storageAccessPolicyId], null, 2);

    expect(storageAccessPolicy).toMatchSnapshot();
    expect(storageAccessPolicy).not.toMatch(/Fn::Sub/);
  });
});

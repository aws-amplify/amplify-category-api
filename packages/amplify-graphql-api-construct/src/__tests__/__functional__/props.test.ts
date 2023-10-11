import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { MappingTemplate } from 'aws-cdk-lib/aws-appsync';
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

describe('supports different props configurations', () => {
  it('supports custom slots', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        functionSlots: [
          {
            typeName: 'Mutation',
            fieldName: 'createTodo',
            slotName: 'preAuth',
            slotIndex: 1,
            function: {
              requestMappingTemplate: MappingTemplate.fromString('$utils.toJson({})'),
            },
          },
          {
            typeName: 'Mutation',
            fieldName: 'createTodo',
            slotName: 'postAuth',
            slotIndex: 1,
            function: {
              requestMappingTemplate: MappingTemplate.fromString('$utils.toJson({})'),
            },
          },
        ],
      });
    });
  });

  it('supports stack mappings', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        stackMappings: {
          CreateTodoResolver: 'MyCustomStack',
        },
      });
    });
  });

  it('supports conflict resolution with automerge', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        conflictResolution: {
          project: {
            handlerType: 'AUTOMERGE',
            detectionType: 'VERSION',
          },
        },
      });
    });
  });

  it('supports conflict resolution with optimistic concurrency', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        conflictResolution: {
          project: {
            handlerType: 'OPTIMISTIC_CONCURRENCY',
            detectionType: 'VERSION',
          },
        },
      });
    });
  });

  it('supports conflict resolution with lambda handling', () => {
    verifySynth((stack) => {
      const conflictHandler = lambda.Function.fromFunctionName(stack, 'ImportedFunction', 'conflict-handler');

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        conflictResolution: {
          project: {
            handlerType: 'LAMBDA',
            detectionType: 'VERSION',
            conflictHandler,
          },
        },
      });
    });
  });

  it('supports a definition with a SQLModelDataSourceBinding', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(
          /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `,
          {
            bindingType: 'MySQL',
            dbConnectionConfig: {
              hostnameSsmPath: '/path/to/hostname',
              usernameSsmPath: '/path/to/username',
              passwordSsmPath: '/path/to/password',
              portSsmPath: '/path/to/port',
              databaseNameSsmPath: '/path/to/databaseName',
            },
            vpcConfiguration: {
              vpcId: 'vpc-123',
              securityGroupIds: ['sg-123'],
              subnetAvailabilityZones: [
                {
                  subnetId: 'subnet-123',
                  availabilityZone: 'us-east-1a',
                },
              ],
            },
          },
        ),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });
    });
  });
});

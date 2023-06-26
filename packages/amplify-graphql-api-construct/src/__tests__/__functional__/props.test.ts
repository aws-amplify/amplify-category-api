import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { MappingTemplate } from 'aws-cdk-lib/aws-appsync';

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
        schema: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `,
        authorizationConfig: {
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
            }
          },
          {
            typeName: 'Mutation',
            fieldName: 'createTodo',
            slotName: 'postAuth',
            slotIndex: 1,
            function: {
              requestMappingTemplate: MappingTemplate.fromString('$utils.toJson({})'),
            }
          },
        ],
      });
    });
  });

  it('supports stack mappings', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        schema: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `,
        authorizationConfig: {
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
        schema: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `,
        authorizationConfig: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        conflictResolution: {
          project: {
            handlerType: 'AUTOMERGE',
            detectionType: 'VERSION',
          }
        },
      });
    });
  });

  it('supports conflict resolution with optimistic concurrency', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        schema: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `,
        authorizationConfig: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        conflictResolution: {
          project: {
            handlerType: 'OPTIMISTIC_CONCURRENCY',
            detectionType: 'VERSION',
          }
        },
      });
    });
  });

  it('supports conflict resolution with lambda handling', () => {
    verifySynth((stack) => {
      const conflictHandler = lambda.Function.fromFunctionName(stack, 'ImportedFunction', 'conflict-handler');

      new AmplifyGraphqlApi(stack, 'TestApi', {
        schema: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `,
        authorizationConfig: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        conflictResolution: {
          project: {
            handlerType: 'LAMBDA',
            detectionType: 'VERSION',
            conflictHandler,
          }
        },
      });
    });
  });
});

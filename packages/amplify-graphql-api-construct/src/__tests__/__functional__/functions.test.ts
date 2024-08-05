import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { IAmplifyGraphqlDefinition } from '../../types';

describe('function directive', () => {
  it('references a function by name defined elsewhere', () => {
    const stack = new cdk.Stack();
    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      apiName: 'MyApi',
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Query {
          repeat(message: String!): String! @function(name: "repeat")
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    expect(api.resources.nestedStacks.FunctionDirectiveStack).toBeDefined();
    const functionDirectiveTemplate = Template.fromStack(api.resources.nestedStacks.FunctionDirectiveStack);

    functionDirectiveTemplate.resourceCountIs('AWS::AppSync::DataSource', 1);
    functionDirectiveTemplate.hasResourceProperties('AWS::AppSync::DataSource', {
      Type: 'AWS_LAMBDA',
      Name: 'RepeatLambdaDataSource',
      LambdaConfig: {
        LambdaFunctionArn: {
          'Fn::If': [
            'HasEnvironmentParameter',
            {
              'Fn::Sub': [
                // eslint-disable-next-line no-template-curly-in-string
                'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:repeat',
                {},
              ],
            },
            {
              // eslint-disable-next-line no-template-curly-in-string
              'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:repeat',
            },
          ],
        },
      },
    });

    functionDirectiveTemplate.resourceCountIs('AWS::IAM::Policy', 1);
    functionDirectiveTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'lambda:InvokeFunction',
            Effect: 'Allow',
            Resource: [
              {
                'Fn::If': [
                  'HasEnvironmentParameter',
                  {
                    'Fn::Sub': [
                      // eslint-disable-next-line no-template-curly-in-string
                      'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:repeat',
                      {},
                    ],
                  },
                  {
                    // eslint-disable-next-line no-template-curly-in-string
                    'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:repeat',
                  },
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::If': [
                        'HasEnvironmentParameter',
                        {
                          'Fn::Sub': [
                            // eslint-disable-next-line no-template-curly-in-string
                            'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:repeat',
                            {},
                          ],
                        },
                        {
                          // eslint-disable-next-line no-template-curly-in-string
                          'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:repeat',
                        },
                      ],
                    },
                    ':*',
                  ],
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('throw an exception if function is imported by arn', () => {
    const stack = new cdk.Stack();
    const referencedFunction = lambda.Function.fromFunctionArn(stack, 'Imported', 'arn:aws:lambda:us-west-2:123456789100:function:dummyFn');

    expect(
      () =>
        new AmplifyGraphqlApi(stack, 'TestApi', {
          apiName: 'MyApi',
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Query {
              repeat(message: String!): String! @function(name: "repeat")
            }
          `),
          functionNameMap: {
            repeat: referencedFunction,
          },
          authorizationModes: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        }),
    ).toThrowErrorMatchingInlineSnapshot(`
      "Cannot modify permission to lambda function. Function is either imported or $LATEST version.
      If the function is imported from the same account use \`fromFunctionAttributes()\` API with the \`sameEnvironment\` flag.
      If the function is imported from a different account and already has the correct permissions use \`fromFunctionAttributes()\` API with the \`skipPermissions\` flag."
    `);
  });

  it('allows importing by attribute with sameEnvironment flag', () => {
    const stack = new cdk.Stack();
    const referencedFunction = lambda.Function.fromFunctionAttributes(stack, 'Imported', {
      functionArn: 'arn:aws:lambda:us-west-2:123456789100:function:dummyFn',
      sameEnvironment: true,
    });

    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      apiName: 'MyApi',
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Query {
          repeat(message: String!): String! @function(name: "repeat")
        }
      `),
      functionNameMap: {
        repeat: referencedFunction,
      },
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    expect(api.resources.nestedStacks.FunctionDirectiveStack).toBeDefined();
    const functionDirectiveTemplate = Template.fromStack(api.resources.nestedStacks.FunctionDirectiveStack);

    functionDirectiveTemplate.resourceCountIs('AWS::AppSync::DataSource', 1);
    functionDirectiveTemplate.hasResourceProperties('AWS::AppSync::DataSource', {
      Type: 'AWS_LAMBDA',
      Name: 'RepeatLambdaDataSource',
      LambdaConfig: {
        LambdaFunctionArn: 'arn:aws:lambda:us-west-2:123456789100:function:dummyFn',
      },
    });

    functionDirectiveTemplate.resourceCountIs('AWS::IAM::Policy', 1);
    functionDirectiveTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'lambda:InvokeFunction',
            Effect: 'Allow',
            Resource: [
              'arn:aws:lambda:us-west-2:123456789100:function:dummyFn',
              'arn:aws:lambda:us-west-2:123456789100:function:dummyFn:*',
            ],
          },
        ],
      },
    });
  });

  it('supports passing in a function defined in-stack', () => {
    const stack = new cdk.Stack();
    const referencedFunction = new lambda.Function(stack, 'Createdfunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline('I am code'),
      handler: 'index.main',
    });

    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      apiName: 'MyApi',
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Query {
          repeat(message: String!): String! @function(name: "repeat")
        }
      `),
      functionNameMap: {
        repeat: referencedFunction,
      },
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    expect(api.resources.nestedStacks.FunctionDirectiveStack).toBeDefined();
    const functionDirectiveTemplate = Template.fromStack(api.resources.nestedStacks.FunctionDirectiveStack);

    functionDirectiveTemplate.resourceCountIs('AWS::AppSync::DataSource', 1);
    functionDirectiveTemplate.hasResourceProperties('AWS::AppSync::DataSource', {
      Type: 'AWS_LAMBDA',
      Name: 'RepeatLambdaDataSource',
      LambdaConfig: {
        LambdaFunctionArn: { Ref: Match.stringLikeRegexp('referencetoCreatedfunction.*Arn') },
      },
    });

    functionDirectiveTemplate.resourceCountIs('AWS::IAM::Policy', 1);
    functionDirectiveTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'lambda:InvokeFunction',
            Effect: 'Allow',
            Resource: [
              { Ref: Match.stringLikeRegexp('referencetoCreatedfunction.*Arn') },
              {
                'Fn::Join': ['', [{ Ref: Match.stringLikeRegexp('referencetoCreatedfunction.*Arn') }, ':*']],
              },
            ],
          },
        ],
      },
    });
  });

  it('wires through a function from the definition', () => {
    const stack = new cdk.Stack();
    const referencedFunction = new lambda.Function(stack, 'Createdfunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromInline('I am code'),
      handler: 'index.main',
    });

    const definition: IAmplifyGraphqlDefinition = {
      schema: /* GraphQL */ `
        type Query {
          repeat(message: String!): String! @function(name: "repeat")
        }
      `,
      functionSlots: [],
      referencedLambdaFunctions: {
        repeat: referencedFunction,
      },
      dataSourceStrategies: {
        ddb: {
          dbType: 'DYNAMODB',
          provisionStrategy: 'DEFAULT',
        },
      },
    };

    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      definition,
      authorizationModes: { apiKeyConfig: { expires: cdk.Duration.days(7) } },
    });

    expect(api.resources.nestedStacks.FunctionDirectiveStack).toBeDefined();
    const functionDirectiveTemplate = Template.fromStack(api.resources.nestedStacks.FunctionDirectiveStack);

    functionDirectiveTemplate.resourceCountIs('AWS::AppSync::DataSource', 1);
    functionDirectiveTemplate.hasResourceProperties('AWS::AppSync::DataSource', {
      Type: 'AWS_LAMBDA',
      Name: 'RepeatLambdaDataSource',
      LambdaConfig: {
        LambdaFunctionArn: { Ref: Match.stringLikeRegexp('referencetoCreatedfunction.*Arn') },
      },
    });

    functionDirectiveTemplate.resourceCountIs('AWS::IAM::Policy', 1);
    functionDirectiveTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'lambda:InvokeFunction',
            Effect: 'Allow',
            Resource: [
              { Ref: Match.stringLikeRegexp('referencetoCreatedfunction.*Arn') },
              {
                'Fn::Join': ['', [{ Ref: Match.stringLikeRegexp('referencetoCreatedfunction.*Arn') }, ':*']],
              },
            ],
          },
        ],
      },
    });
  });
});

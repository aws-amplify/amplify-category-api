/* eslint-disable no-template-curly-in-string */
import { Match, Template } from 'aws-cdk-lib/assertions';
import { parse } from 'graphql';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { FunctionTransformer } from '..';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';

const getFunctionDirectiveStackSummaries = (stacks: Record<string, any>): Array<{ stackName: string; byType: Record<string, number> }> =>
  Object.entries(stacks)
    .filter(([stackName]) => stackName.startsWith('FunctionDirectiveStack'))
    .map(([stackName, stack]) => ({
      stackName,
      byType: Object.values(stack.Resources ?? {}).reduce((acc: Record<string, number>, resource: any) => {
        const type = resource.Type ?? '<unknown>';
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
      }, {}),
    }));

test('for @function with only name, it generates the expected resources', () => {
  const validSchema = `
    type Query {
        echo(msg: String): String @function(name: "echofunction-\${env}")
    }
    `;

  const out = testTransform({
    schema: validSchema,
    transformers: [new FunctionTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.stacks).toBeDefined();
  parse(out.schema);
  const stack = out.stacks.FunctionDirectiveStack;
  const iamStack = out.stacks.FunctionDirectiveStackIam;
  expect(stack).toBeDefined();
  expect(iamStack).toBeDefined();
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Role', 0);
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Policy', 0);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::DataSource', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 1);
  Template.fromJSON(iamStack).resourceCountIs('AWS::IAM::Role', 1);
  Template.fromJSON(iamStack).resourceCountIs('AWS::IAM::Policy', 1);
  Template.fromJSON(iamStack).hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'appsync.amazonaws.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
  });
  Template.fromJSON(iamStack).hasResourceProperties('AWS::IAM::Policy', {
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
                    'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:echofunction-${env}',
                    { env: { Ref: Match.anyValue() } },
                  ],
                },
                { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:echofunction' },
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
                          'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:echofunction-${env}',
                          { env: { Ref: Match.anyValue() } },
                        ],
                      },
                      { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:echofunction' },
                    ],
                  },
                  ':*',
                ],
              ],
            },
          ],
        },
      ],
      Version: '2012-10-17',
    },
    PolicyName: Match.anyValue(),
    Roles: [{ Ref: Match.anyValue() }],
  });
  Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::DataSource', {
    ApiId: { Ref: Match.anyValue() },
    Name: 'EchofunctionLambdaDataSource',
    Type: 'AWS_LAMBDA',
    LambdaConfig: {
      LambdaFunctionArn: {
        'Fn::If': [
          'HasEnvironmentParameter',
          {
            'Fn::Sub': ['arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:echofunction-${env}', { env: { Ref: Match.anyValue() } }],
          },
          { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:echofunction' },
        ],
      },
    },
    ServiceRoleArn: {
      Ref: Match.stringLikeRegexp(
        'FunctionDirectiveStackIamNestedStack.*Outputs.*FunctionDirectiveStackIamEchofunctionLambdaDataSourceServiceRole[A-Z0-9]+Arn$',
      ),
    },
  });
  Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
    ApiId: { Ref: Match.anyValue() },
    DataSourceName: { 'Fn::GetAtt': [Match.anyValue(), 'Name'] },
    FunctionVersion: '2018-05-29',
    Name: 'InvokeEchofunctionLambdaDataSource',
    RequestMappingTemplateS3Location: {
      'Fn::Join': [
        '',
        ['s3://', { Ref: Match.anyValue() }, '/', { Ref: Match.anyValue() }, '/resolvers/InvokeEchofunctionLambdaDataSource.req.vtl'],
      ],
    },
    ResponseMappingTemplateS3Location: {
      'Fn::Join': [
        '',
        ['s3://', { Ref: Match.anyValue() }, '/', { Ref: Match.anyValue() }, '/resolvers/InvokeEchofunctionLambdaDataSource.res.vtl'],
      ],
    },
  });
  Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::Resolver', {
    ApiId: { Ref: Match.anyValue() },
    FieldName: 'echo',
    TypeName: 'Query',
    Kind: 'PIPELINE',
    PipelineConfig: {
      Functions: [{ 'Fn::GetAtt': [Match.anyValue(), 'FunctionId'] }],
    },
    RequestMappingTemplate: Match.anyValue(),
    ResponseMappingTemplateS3Location: {
      'Fn::Join': ['', ['s3://', { Ref: Match.anyValue() }, '/', { Ref: Match.anyValue() }, '/resolvers/Query.echo.res.vtl']],
    },
  });
  expect(out.resolvers).toMatchSnapshot();
});

test('for @function with account ID, it generates the expected resources', () => {
  const validSchema = `
    type Query {
        echo(msg: String): String @function(name: "echofunction", accountId: "123123456456")
    }
    `;

  const out = testTransform({
    schema: validSchema,
    transformers: [new FunctionTransformer()],
  });
  expect(out).toBeDefined();
  expect(out.stacks).toBeDefined();
  parse(out.schema);
  const stack = out.stacks.FunctionDirectiveStack;
  const iamStack = out.stacks.FunctionDirectiveStackIam;
  expect(stack).toBeDefined();
  expect(iamStack).toBeDefined();
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Role', 0);
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Policy', 0);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::DataSource', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 1);
  Template.fromJSON(iamStack).resourceCountIs('AWS::IAM::Role', 1);
  Template.fromJSON(iamStack).resourceCountIs('AWS::IAM::Policy', 1);
  Template.fromJSON(iamStack).hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'appsync.amazonaws.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
  });
  Template.fromJSON(iamStack).hasResourceProperties('AWS::IAM::Policy', {
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
                  'Fn::Sub': ['arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction', {}],
                },
                { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction' },
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
                        'Fn::Sub': ['arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction', {}],
                      },
                      { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction' },
                    ],
                  },
                  ':*',
                ],
              ],
            },
          ],
        },
      ],
      Version: '2012-10-17',
    },
    PolicyName: Match.anyValue(),
    Roles: [{ Ref: Match.anyValue() }],
  });
  Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::DataSource', {
    ApiId: { Ref: Match.anyValue() },
    Name: 'Echofunction123123456456LambdaDataSource',
    Type: 'AWS_LAMBDA',
    LambdaConfig: {
      LambdaFunctionArn: {
        'Fn::If': [
          'HasEnvironmentParameter',
          {
            'Fn::Sub': ['arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction', {}],
          },
          { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction' },
        ],
      },
    },
    ServiceRoleArn: {
      Ref: Match.stringLikeRegexp(
        'FunctionDirectiveStackIamNestedStack.*Outputs.*FunctionDirectiveStackIamEchofunction123123456456LambdaDataSourceServiceRole[A-Z0-9]+Arn$',
      ),
    },
  });
  Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
    ApiId: { Ref: Match.anyValue() },
    DataSourceName: { 'Fn::GetAtt': [Match.anyValue(), 'Name'] },
    FunctionVersion: '2018-05-29',
    Name: 'InvokeEchofunction123123456456LambdaDataSource',
    RequestMappingTemplateS3Location: {
      'Fn::Join': [
        '',
        [
          's3://',
          { Ref: Match.anyValue() },
          '/',
          { Ref: Match.anyValue() },
          '/resolvers/InvokeEchofunction123123456456LambdaDataSource.req.vtl',
        ],
      ],
    },
    ResponseMappingTemplateS3Location: {
      'Fn::Join': [
        '',
        [
          's3://',
          { Ref: Match.anyValue() },
          '/',
          { Ref: Match.anyValue() },
          '/resolvers/InvokeEchofunction123123456456LambdaDataSource.res.vtl',
        ],
      ],
    },
  });
  Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::Resolver', {
    ApiId: { Ref: Match.anyValue() },
    FieldName: 'echo',
    TypeName: 'Query',
    Kind: 'PIPELINE',
    PipelineConfig: {
      Functions: [{ 'Fn::GetAtt': [Match.anyValue(), 'FunctionId'] }],
    },
    RequestMappingTemplate: Match.anyValue(),
    ResponseMappingTemplateS3Location: {
      'Fn::Join': ['', ['s3://', { Ref: Match.anyValue() }, '/', { Ref: Match.anyValue() }, '/resolvers/Query.echo.res.vtl']],
    },
  });
  expect(out.resolvers).toMatchSnapshot();
});

test('two @function directives for the same lambda should produce a single datasource, single role and two resolvers', () => {
  const validSchema = `
    type Query {
        echo(msg: String): String @function(name: "echofunction-\${env}")
        magic(msg: String): String @function(name: "echofunction-\${env}")
    }
    `;

  const out = testTransform({
    schema: validSchema,
    transformers: [new FunctionTransformer()],
  });
  expect(out).toBeDefined();
  parse(out.schema);
  expect(out.stacks).toBeDefined();
  const stack = out.stacks.FunctionDirectiveStack;
  const iamStack = out.stacks.FunctionDirectiveStackIam;
  expect(stack).toBeDefined();
  expect(iamStack).toBeDefined();
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Role', 0);
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Policy', 0);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::DataSource', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 2);
  Template.fromJSON(iamStack).resourceCountIs('AWS::IAM::Role', 1);
  Template.fromJSON(iamStack).resourceCountIs('AWS::IAM::Policy', 1);
});

test('shards large @function directive stacks with field auth below the CloudFormation resource limit', () => {
  const functionFields = Array.from(
    { length: 86 },
    (_, index) => `field${index}: String @function(name: "function${index}-\${env}") @auth(rules: [{ allow: private, provider: iam }])`,
  ).join('\n');
  const validSchema = `
    type Query {
      ${functionFields}
    }
    `;

  const warn = jest.spyOn(console, 'warn').mockImplementation();
  try {
    const out = testTransform({
      schema: validSchema,
      transformers: [new AuthTransformer(), new FunctionTransformer()],
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AWS_IAM',
        },
        additionalAuthenticationProviders: [],
      },
    });

    const summaries = getFunctionDirectiveStackSummaries(out.stacks);
    const appSyncStacks = summaries.filter(({ byType }) => Object.keys(byType).some((type) => type.startsWith('AWS::AppSync::')));
    const iamStacks = summaries.filter(({ byType }) => (byType['AWS::IAM::Role'] ?? 0) > 0 || (byType['AWS::IAM::Policy'] ?? 0) > 0);

    expect(appSyncStacks).toHaveLength(1);
    expect(iamStacks.length).toBeGreaterThan(0);
    expect(summaries.length).toBeGreaterThan(1);
    expect(Math.max(...summaries.map(({ byType }) => Object.values(byType).reduce((total, count) => total + count, 0)))).toBeLessThan(500);
  } finally {
    warn.mockRestore();
  }
});

test('two @function directives for the same field should be valid', () => {
  const validSchema = `
    type Query {
        echo(msg: String): String @function(name: "echofunction-\${env}") @function(name: "otherfunction")
    }
    `;

  const out = testTransform({
    schema: validSchema,
    transformers: [new FunctionTransformer()],
  });
  expect(out).toBeDefined();
  parse(out.schema);
  expect(out.stacks).toBeDefined();
  const stack = out.stacks.FunctionDirectiveStack;
  expect(stack).toBeDefined();
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 1);
  Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::Resolver', {
    ApiId: { Ref: Match.anyValue() },
    FieldName: 'echo',
    TypeName: 'Query',
    Kind: 'PIPELINE',
    PipelineConfig: {
      Functions: [{ 'Fn::GetAtt': [Match.anyValue(), 'FunctionId'] }, { 'Fn::GetAtt': [Match.anyValue(), 'FunctionId'] }],
    },
  });
});

test('@function directive applied to Object should throw Error', () => {
  const invalidSchema = `
    type Query @function(name: "echofunction-\${env}") {
        echo(msg: String): String @function(name: "echofunction-\${env}")
    }
    `;

  expect(() =>
    testTransform({
      schema: invalidSchema,
      transformers: [new FunctionTransformer()],
    }),
  ).toThrow('Directive "@function" may not be used on OBJECT.');
});

test('includes auth info in stash', () => {
  const validSchema = `
    type Query {
      myFunction(userId: ID!): String
        @function(name: "myFunc-\${env}")
        @auth(rules: [{ allow: private, provider: iam }])
    }
    `;

  const out = testTransform({
    schema: validSchema,
    transformers: [new AuthTransformer(), new FunctionTransformer()],
    synthParameters: { identityPoolId: 'fake-test-id', adminRoles: ['fake-test-role'] },
    authConfig: {
      defaultAuthentication: {
        authenticationType: 'AWS_IAM',
      },
      additionalAuthenticationProviders: [],
    },
  });
  expect(out.stacks.FunctionDirectiveStack.Resources!.QuerymyFunctionResolver.Properties.RequestMappingTemplate).toMatchSnapshot();
});

describe('Event invocation type', () => {
  test('Defined on Query succeeds', () => {
    const schema = `
      type Query {
        asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
      }

      type EventInvocationResponse {
        success: Boolean!
      }
    `;

    const out = testTransform({ schema, transformers: [new FunctionTransformer()] });
    expect(out).toBeDefined();
    parse(out.schema);
    expect(out.stacks).toBeDefined();

    const stack = out.stacks.FunctionDirectiveStack;
    expect(stack).toBeDefined();

    const resolvers = out.resolvers;
    expect(resolvers).toBeDefined();
    expect(resolvers).toMatchSnapshot();
  });

  test('Defined on Mutation succeeds', () => {
    const schema = `
    type Mutation {
      asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
    }

    type EventInvocationResponse {
      success: Boolean!
    }
  `;

    const out = testTransform({ schema, transformers: [new FunctionTransformer()] });
    expect(out).toBeDefined();

    parse(out.schema);
    expect(out.schema).toBeDefined();
    expect(out.schema).toMatchSnapshot();

    expect(out.stacks).toBeDefined();
    const stack = out.stacks.FunctionDirectiveStack;
    expect(stack).toBeDefined();

    const resolvers = out.resolvers;
    expect(resolvers).toBeDefined();
    expect(resolvers).toMatchSnapshot();
  });

  test('event invocation fails on non query or mutation parent type', () => {
    const schema = `
    type Foo @model {
      asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
    }

    type EventInvocationResponse {
      success: Boolean!
    }
    `;

    expect(() => testTransform({ schema, transformers: [new ModelTransformer(), new FunctionTransformer()] })).toThrowError(
      "@function definition with 'invocationType: Event' must be defined on Query or Mutation field.",
    );
  });

  describe('Chained directives', () => {
    test('chained @function -- RequestResponse > Event succeeds with EventInvocationResponse', () => {
      const schema = `
        type Mutation {
          asyncStuff(msg: String): EventInvocationResponse
          @function(name: "asyncstuff2-\${env}")
          @function(name: "asyncstuff-\${env}", invocationType: Event)
        }
        type EventInvocationResponse {
          success: Boolean!
        }
      `;
      const out = testTransform({ schema, transformers: [new FunctionTransformer()] });
      expect(out).toBeDefined();
      expect(out.resolvers['InvokeAsyncstuffLambdaDataSource.res.vtl']).toMatchSnapshot();
      expect(out.resolvers['InvokeAsyncstuff2LambdaDataSource.res.vtl']).toMatchSnapshot();
    });

    test('chained @function -- RequestResponse > Event fails without EventInvocationResponse', () => {
      const schema = `
        type Mutation {
          asyncStuff(msg: String): String
          @function(name: "syncstuff-\${env}")
          @function(name: "asyncstuff-\${env}", invocationType: Event)
        }
      `;

      const expectedErrorMessage =
        'Invalid return type String for asyncStuff(msg: String): String @function(name: syncstuff-${env}) @function(name: asyncstuff-${env}, invocationType: Event).\n' +
        "Use return type 'EventInvocationResponse' and, if necessary, add 'type EventInvocationResponse { success: Boolean! }' to your model schema.";

      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('chained @function -- Event > Event succeeds with EventInvocationResponse', () => {
      const schema = `
      type Mutation {
        asyncStuff(msg: String): EventInvocationResponse
        @function(name: "asyncstuff-\${env}", invocationType: Event)
        @function(name: "asyncstuff2-\${env}", invocationType: Event)
      }

      type EventInvocationResponse {
        success: Boolean!
      }
    `;
      const out = testTransform({ schema, transformers: [new FunctionTransformer()] });
      expect(out).toBeDefined();
      expect(out.resolvers['InvokeAsyncstuffLambdaDataSource.res.vtl']).toMatchSnapshot();
      expect(out.resolvers['InvokeAsyncstuff2LambdaDataSource.res.vtl']).toMatchSnapshot();
    });

    test('chained @function -- Event > Event fails without EventInvocationResponse', () => {
      const schema = `
        type Mutation {
          asyncStuff(msg: String): String
          @function(name: "asyncstuff-\${env}", invocationType: Event)
          @function(name: "asyncstuff2-\${env}", invocationType: Event)
        }
      `;
      const expectedErrorMessage =
        'Invalid return type String for asyncStuff(msg: String): String @function(name: asyncstuff-${env}, invocationType: Event) @function(name: asyncstuff2-${env}, invocationType: Event).\n' +
        "Use return type 'EventInvocationResponse' and, if necessary, add 'type EventInvocationResponse { success: Boolean! }' to your model schema.";

      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('chained @function -- Event > RequestResponse succeeds without EventInvocationResponse', () => {
      const schema = `
        type Mutation {
          syncStuff(msg: String): String
          @function(name: "asyncstuff-\${env}", invocationType: Event)
          @function(name: "asyncstuff2-\${env}")
        }
      `;
      const out = testTransform({ schema, transformers: [new FunctionTransformer()] });
      expect(out).toBeDefined();
      expect(out.resolvers['InvokeSyncstuffLambdaDataSource.res.vtl']).toMatchSnapshot();
      expect(out.resolvers['InvokeSyncstuff2LambdaDataSource.res.vtl']).toMatchSnapshot();
    });
  });

  describe('Event invocation type invalid return types', () => {
    test('NamedType scalar fails validation', () => {
      const schema = `
      type Mutation {
        asyncStuff(msg: String): Int @function(name: "asyncstuff-\${env}", invocationType: Event)
      }
    `;

      const expectedErrorMessage =
        'Invalid return type Int for asyncStuff(msg: String): Int @function(name: asyncstuff-${env}, invocationType: Event).\n' +
        "Use return type 'EventInvocationResponse' and, if necessary, add 'type EventInvocationResponse { success: Boolean! }' to your model schema.";
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('ListType scalar fails validation', () => {
      const schema = `
      type Mutation {
        asyncStuff(msg: String): [Int] @function(name: "asyncstuff-\${env}", invocationType: Event)
      }
    `;

      const expectedErrorMessage =
        'Invalid return type [Int] for asyncStuff(msg: String): [Int] @function(name: asyncstuff-${env}, invocationType: Event).\n' +
        "Use return type 'EventInvocationResponse' and, if necessary, add 'type EventInvocationResponse { success: Boolean! }' to your model schema.";
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('ListType NonNull custom type fails validation', () => {
      const schema = `
      type Mutation {
        asyncStuff(msg: String): [Foo!] @function(name: "asyncstuff-\${env}", invocationType: Event)
      }

      type Foo {
        bar: String!
      }
    `;

      const expectedErrorMessage =
        'Invalid return type [Foo!] for asyncStuff(msg: String): [Foo!] @function(name: asyncstuff-${env}, invocationType: Event).\n' +
        "Use return type 'EventInvocationResponse' and, if necessary, add 'type EventInvocationResponse { success: Boolean! }' to your model schema.";
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('NonNull ListType fails validation', () => {
      const schema = `
      type Mutation {
        asyncStuff(msg: String): [String]! @function(name: "asyncstuff-\${env}", invocationType: Event)
      }
    `;

      const expectedErrorMessage =
        'Invalid return type [String]! for asyncStuff(msg: String): [String]! @function(name: asyncstuff-${env}, invocationType: Event).\n' +
        "Use return type 'EventInvocationResponse' and, if necessary, add 'type EventInvocationResponse { success: Boolean! }' to your model schema.";
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('NonNull ListType NonNull scalar fails validation', () => {
      const schema = `
      type Mutation {
        asyncStuff(msg: String): [Boolean!]! @function(name: "asyncstuff-\${env}", invocationType: Event)
      }
    `;

      const expectedErrorMessage =
        'Invalid return type [Boolean!]! for asyncStuff(msg: String): [Boolean!]! @function(name: asyncstuff-${env}, invocationType: Event).\n' +
        "Use return type 'EventInvocationResponse' and, if necessary, add 'type EventInvocationResponse { success: Boolean! }' to your model schema.";
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('EventInvocationResponse with non null response type fails validation', () => {
      const schema = `
        type Mutation {
          asyncStuff(msg: String): EventInvocationResponse! @function(name: "asyncstuff-\${env}", invocationType: Event)
        }

        type EventInvocationResponse {
          success: Boolean!
        }
      `;

      const expectedErrorMessage =
        'Invalid return type EventInvocationResponse! for asyncStuff(msg: String): EventInvocationResponse! @function(name: asyncstuff-${env}, invocationType: Event).\n' +
        "Use return type 'EventInvocationResponse' and, if necessary, add 'type EventInvocationResponse { success: Boolean! }' to your model schema.";
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });
  });

  describe('Event invocation type invalid EventInvocationResponse definition', () => {
    test('EventInvocationResponse type missing in schema fails validation', () => {
      const schema = `
      type Mutation {
        asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
      }
    `;

      const expectedErrorRegex = /Unknown type "EventInvocationResponse"/;
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorRegex);
    });

    test('EventInvocationResponse with unexpected field fails validation', () => {
      const schema = `
        type Mutation {
          asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
        }

        type EventInvocationResponse {
          success: Boolean!
          otherStuff: String
        }
      `;

      const expectedErrorMessage =
        "Invalid 'EventInvocationResponse' definition. Update the type definition in your schema to:\n" +
        'type EventInvocationResponse { success: Boolean! }';
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('EventInvocationResponse with non success field name fails validation', () => {
      const schema = `
        type Mutation {
          asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
        }

        type EventInvocationResponse {
          invalidFieldName: Boolean!
        }
      `;

      const expectedErrorMessage =
        "Invalid 'EventInvocationResponse' definition. Update the type definition in your schema to:\n" +
        'type EventInvocationResponse { success: Boolean! }';
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('EventInvocationResponse with nullable success field fails validation', () => {
      const schema = `
        type Mutation {
          asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
        }

        type EventInvocationResponse {
          success: Boolean
        }
      `;

      const expectedErrorMessage =
        "Invalid 'EventInvocationResponse' definition. Update the type definition in your schema to:\n" +
        'type EventInvocationResponse { success: Boolean! }';
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });

    test('EventInvocationResponse with non-boolean success field type fails validation', () => {
      const schema = `
        type Mutation {
          asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
        }

        type EventInvocationResponse {
          success: String!
        }
      `;

      const expectedErrorMessage =
        "Invalid 'EventInvocationResponse' definition. Update the type definition in your schema to:\n" +
        'type EventInvocationResponse { success: Boolean! }';
      expect(() => testTransform({ schema, transformers: [new FunctionTransformer()] })).toThrowError(expectedErrorMessage);
    });
  });
});

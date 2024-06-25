/* eslint-disable no-template-curly-in-string */
import { Match, Template } from 'aws-cdk-lib/assertions';
import { parse } from 'graphql';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { FunctionTransformer } from '..';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';

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
  expect(stack).toBeDefined();
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Role', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Policy', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::DataSource', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 1);
  Template.fromJSON(stack).hasResourceProperties('AWS::IAM::Role', {
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
  Template.fromJSON(stack).hasResourceProperties('AWS::IAM::Policy', {
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
      'Fn::GetAtt': ['EchofunctionLambdaDataSourceServiceRole3BE2FA57', 'Arn'],
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
  expect(stack).toBeDefined();
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Role', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Policy', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::DataSource', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 1);
  Template.fromJSON(stack).hasResourceProperties('AWS::IAM::Role', {
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
  Template.fromJSON(stack).hasResourceProperties('AWS::IAM::Policy', {
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
      'Fn::GetAtt': ['Echofunction123123456456LambdaDataSourceServiceRole0B60B47E', 'Arn'],
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
  expect(stack).toBeDefined();
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Role', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::IAM::Policy', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::DataSource', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 2);
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

test('event invocation type query', () => {
  const schema = `
    type Query {
      asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
    }

    type EventInvocationResponse {
      success: Boolean!
    }
  `;

  const out = testTransform({
    schema,
    transformers: [new FunctionTransformer()],
  });
  expect(out).toBeDefined();
  parse(out.schema);
  expect(out.stacks).toBeDefined();

  const stack = out.stacks.FunctionDirectiveStack;
  expect(stack).toBeDefined();

  const resolvers = out.resolvers;
  expect(resolvers).toBeDefined();
  expect(resolvers).toMatchSnapshot();
});

test('event invocation with included EventInvocationResponse type in schema definition succeeds', () => {
  const schema = `
  type Mutation {
    asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
  }

  type EventInvocationResponse {
    success: Boolean!
  }
`;

  const out = testTransform({
    schema,
    transformers: [new FunctionTransformer()],
  });
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

test('event invocation invalid return type fails', () => {
  const schema = `
  type Mutation {
    asyncStuff(msg: String): Int @function(name: "asyncstuff-\${env}", invocationType: Event)
  }
`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new FunctionTransformer()],
    }),
  ).toThrowError("Invalid return type for 'invocationType: Event'. Return type must be 'EventInvocationResponse'.");
});

test('event invocation missing return type fails', () => {
  const schema = `
  type Mutation {
    asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
  }
`;

  const expectedErrorRegex = /Unknown type "EventInvocationResponse"/
  expect(() =>
    testTransform({
      schema,
      transformers: [new FunctionTransformer()],
    }),
  ).toThrowError(expectedErrorRegex);
});


test('event invocation fails on non query or mutation parent type', () => {
  const schema = `
  type Foo @model {
    asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
  }
`;

  expect(() =>
    testTransform({
      schema,
      transformers: [new ModelTransformer(), new FunctionTransformer()],
    }),
  ).toThrowError('@function definition with invocationType: Event must be defined on Query or Mutation.');
});

test('event invocation invalid response type definition', () => {
  const schema = `
    type Mutation {
      asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
    }

    type EventInvocationResponse {
      success: Boolean!
      otherStuff: String
    }
  `;

  expect(() =>
    testTransform({
      schema,
      transformers: [new FunctionTransformer()],
    }),
  ).toThrowError('!containsOneField');
});

test('event invocation invalid response type definition2', () => {
  const schema = `
    type Mutation {
      asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
    }

    type EventInvocationResponse {
      invalidFieldName: Boolean!
    }
  `;

  expect(() =>
    testTransform({
      schema,
      transformers: [new FunctionTransformer()],
    }),
  ).toThrowError('!schemaDefinedTypeHasValidShape');
});

test('event invocation invalid response type with nullable success field', () => {
  const schema = `
    type Mutation {
      asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
    }

    type EventInvocationResponse {
      success: Boolean
    }
  `;

  expect(() =>
    testTransform({
      schema,
      transformers: [new FunctionTransformer()],
    }),
  ).toThrowError('!schemaDefinedTypeHasValidShape');
});

test('event invocation invalid response type with non-boolean success field type', () => {
  const schema = `
    type Mutation {
      asyncStuff(msg: String): EventInvocationResponse @function(name: "asyncstuff-\${env}", invocationType: Event)
    }

    type EventInvocationResponse {
    
    }
  `;

  expect(() =>
    testTransform({
      schema,
      transformers: [new FunctionTransformer()],
    }),
  ).toThrowError('!schemaDefinedTypeHasValidShape');
});

// const containsGeneratedEventInvocationResponseType = (definitionNode: DefinitionNode): boolean => {
//   return (
//     definitionNode.kind === 'ObjectTypeDefinition' &&
//     definitionNode.name.value === 'EventInvocationResponse' &&
//     definitionNode.fields?.length === 1 &&
//     definitionNode.fields[0].name.value === 'success' &&
//     definitionNode.fields[0].type.kind === 'NonNullType'
//   );
// };

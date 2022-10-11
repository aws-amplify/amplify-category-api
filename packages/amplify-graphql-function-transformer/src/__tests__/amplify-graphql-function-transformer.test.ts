'use strict';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GraphQLTransform } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { FunctionTransformer } from '..';

test('it generates the expected resources', () => {
  const validSchema = `
    type Query {
        echo(msg: String): String @function(name: "echofunction-\${env}")
    }
    `;

  const transformer = new GraphQLTransform({
    transformers: [new FunctionTransformer()],
  });

  const out = transformer.transform(validSchema);
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
  Template.fromJSON(stack)
    .hasResourceProperties('AWS::IAM::Role', {
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
  Template.fromJSON(stack)
    .hasResourceProperties('AWS::IAM::Policy', {
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
                    'Fn::Sub': ['arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:echofunction-${env}', { env: { Ref: Match.anyValue() } }],
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
                          'Fn::Sub': ['arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:echofunction-${env}', { env: { Ref: Match.anyValue() } }],
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
  Template.fromJSON(stack)
    .hasResourceProperties('AWS::AppSync::DataSource', {
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
  Template.fromJSON(stack)
    .hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
      ApiId: { Ref: Match.anyValue() },
      DataSourceName: { 'Fn::GetAtt': [Match.anyValue(), 'Name'] },
      FunctionVersion: '2018-05-29',
      Name: 'InvokeEchofunctionLambdaDataSource',
      RequestMappingTemplateS3Location: {
        'Fn::Join': ['', ['s3://', { Ref: Match.anyValue() }, '/', { Ref: Match.anyValue() }, '/resolvers/InvokeEchofunctionLambdaDataSource.req.vtl']],
      },
      ResponseMappingTemplateS3Location: {
        'Fn::Join': ['', ['s3://', { Ref: Match.anyValue() }, '/', { Ref: Match.anyValue() }, '/resolvers/InvokeEchofunctionLambdaDataSource.res.vtl']],
      },
    });
  Template.fromJSON(stack)
    .hasResourceProperties('AWS::AppSync::Resolver', {
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

  const transformer = new GraphQLTransform({
    transformers: [new FunctionTransformer()],
  });
  const out = transformer.transform(validSchema);
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

  const transformer = new GraphQLTransform({
    transformers: [new FunctionTransformer()],
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  parse(out.schema);
  expect(out.stacks).toBeDefined();
  const stack = out.stacks.FunctionDirectiveStack;
  expect(stack).toBeDefined();
  Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 1);
  Template.fromJSON(stack)
    .hasResourceProperties('AWS::AppSync::Resolver', {
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

  const transformer = new GraphQLTransform({
    transformers: [new FunctionTransformer()],
  });
  expect(() => {
    transformer.transform(invalidSchema);
  }).toThrow('Directive "function" may not be used on OBJECT.');
});

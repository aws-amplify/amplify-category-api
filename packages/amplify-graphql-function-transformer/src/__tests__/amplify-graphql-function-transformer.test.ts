/* eslint-disable no-template-curly-in-string */
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GraphQLTransform, TransformResourceProvider } from '@aws-amplify/graphql-transformer-core';
import { App } from 'aws-cdk-lib';
import { FunctionTransformer } from '..';

const transformAndSynth = (schema: string): TransformResourceProvider => {
  const app = new App();
  const transformResourceProvider = new GraphQLTransform({ transformers: [new FunctionTransformer()] }).transform(app, schema)
  app.synth({ force: true, skipValidation: true });
  return transformResourceProvider;
};

const asTemplate = (x: any | undefined): Template => {
  expect(x).toBeDefined();
  return Template.fromJSON(x!);
};

test('for @function with only name, it generates the expected resources', () => {
  const validSchema = `
    type Query {
        echo(msg: String): String @function(name: "echofunction-\${env}")
    }
    `;

  const { getCloudFormationTemplates, getMappingTemplates } = transformAndSynth(validSchema);
  const stacks = getCloudFormationTemplates();
  const fileAssets = getMappingTemplates();
  const resolvers: Record<string, string> = {};
  for (const [templateName, template] of fileAssets) {
    if (templateName.startsWith('resolvers/')) {
      resolvers[templateName.replace('resolvers/', '')] = template;
    }
  }
  expect(stacks).toBeDefined();
  const template = asTemplate(stacks.get('FunctionDirectiveStack'));
  template.resourceCountIs('AWS::IAM::Role', 1);
  template.resourceCountIs('AWS::IAM::Policy', 1);
  template.resourceCountIs('AWS::AppSync::DataSource', 1);
  template.resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
  template.resourceCountIs('AWS::AppSync::Resolver', 1);
  template.hasResourceProperties('AWS::IAM::Role', {
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
  template.hasResourceProperties('AWS::IAM::Policy', {
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
  template.hasResourceProperties('AWS::AppSync::DataSource', {
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
  template.hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
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
  template.hasResourceProperties('AWS::AppSync::Resolver', {
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
  expect(resolvers).toMatchSnapshot();
});

// test('for @function with account ID, it generates the expected resources', () => {
//   const validSchema = `
//     type Query {
//         echo(msg: String): String @function(name: "echofunction", accountId: "123123456456")
//     }
//     `;

//   const out = transformAndSynth(validSchema);
//   expect(out.stacks).toBeDefined();
//   parse(out.schema);
//   const stack = out.stacks.FunctionDirectiveStack;
//   expect(stack).toBeDefined();
//   Template.fromJSON(stack).resourceCountIs('AWS::IAM::Role', 1);
//   Template.fromJSON(stack).resourceCountIs('AWS::IAM::Policy', 1);
//   Template.fromJSON(stack).resourceCountIs('AWS::AppSync::DataSource', 1);
//   Template.fromJSON(stack).resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
//   Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 1);
//   Template.fromJSON(stack).hasResourceProperties('AWS::IAM::Role', {
//     AssumeRolePolicyDocument: {
//       Statement: [
//         {
//           Action: 'sts:AssumeRole',
//           Effect: 'Allow',
//           Principal: {
//             Service: 'appsync.amazonaws.com',
//           },
//         },
//       ],
//       Version: '2012-10-17',
//     },
//   });
//   Template.fromJSON(stack).hasResourceProperties('AWS::IAM::Policy', {
//     PolicyDocument: {
//       Statement: [
//         {
//           Action: 'lambda:InvokeFunction',
//           Effect: 'Allow',
//           Resource: [
//             {
//               'Fn::If': [
//                 'HasEnvironmentParameter',
//                 {
//                   'Fn::Sub': ['arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction', {}],
//                 },
//                 { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction' },
//               ],
//             },
//             {
//               'Fn::Join': [
//                 '',
//                 [
//                   {
//                     'Fn::If': [
//                       'HasEnvironmentParameter',
//                       {
//                         'Fn::Sub': ['arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction', {}],
//                       },
//                       { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction' },
//                     ],
//                   },
//                   ':*',
//                 ],
//               ],
//             },
//           ],
//         },
//       ],
//       Version: '2012-10-17',
//     },
//     PolicyName: Match.anyValue(),
//     Roles: [{ Ref: Match.anyValue() }],
//   });
//   Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::DataSource', {
//     ApiId: { Ref: Match.anyValue() },
//     Name: 'Echofunction123123456456LambdaDataSource',
//     Type: 'AWS_LAMBDA',
//     LambdaConfig: {
//       LambdaFunctionArn: {
//         'Fn::If': [
//           'HasEnvironmentParameter',
//           {
//             'Fn::Sub': ['arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction', {}],
//           },
//           { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:123123456456:function:echofunction' },
//         ],
//       },
//     },
//     ServiceRoleArn: {
//       'Fn::GetAtt': ['Echofunction123123456456LambdaDataSourceServiceRole0B60B47E', 'Arn'],
//     },
//   });
//   Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
//     ApiId: { Ref: Match.anyValue() },
//     DataSourceName: { 'Fn::GetAtt': [Match.anyValue(), 'Name'] },
//     FunctionVersion: '2018-05-29',
//     Name: 'InvokeEchofunction123123456456LambdaDataSource',
//     RequestMappingTemplateS3Location: {
//       'Fn::Join': [
//         '',
//         [
//           's3://',
//           { Ref: Match.anyValue() },
//           '/',
//           { Ref: Match.anyValue() },
//           '/resolvers/InvokeEchofunction123123456456LambdaDataSource.req.vtl',
//         ],
//       ],
//     },
//     ResponseMappingTemplateS3Location: {
//       'Fn::Join': [
//         '',
//         [
//           's3://',
//           { Ref: Match.anyValue() },
//           '/',
//           { Ref: Match.anyValue() },
//           '/resolvers/InvokeEchofunction123123456456LambdaDataSource.res.vtl',
//         ],
//       ],
//     },
//   });
//   Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::Resolver', {
//     ApiId: { Ref: Match.anyValue() },
//     FieldName: 'echo',
//     TypeName: 'Query',
//     Kind: 'PIPELINE',
//     PipelineConfig: {
//       Functions: [{ 'Fn::GetAtt': [Match.anyValue(), 'FunctionId'] }],
//     },
//     RequestMappingTemplate: Match.anyValue(),
//     ResponseMappingTemplateS3Location: {
//       'Fn::Join': ['', ['s3://', { Ref: Match.anyValue() }, '/', { Ref: Match.anyValue() }, '/resolvers/Query.echo.res.vtl']],
//     },
//   });
//   expect(out.resolvers).toMatchSnapshot();
// });

// test('two @function directives for the same lambda should produce a single datasource, single role and two resolvers', () => {
//   const validSchema = `
//     type Query {
//         echo(msg: String): String @function(name: "echofunction-\${env}")
//         magic(msg: String): String @function(name: "echofunction-\${env}")
//     }
//     `;

//   const out = transformAndSynth(validSchema);
//   expect(out.stacks).toBeDefined();
//   const stack = out.stacks.FunctionDirectiveStack;
//   expect(stack).toBeDefined();
//   Template.fromJSON(stack).resourceCountIs('AWS::IAM::Role', 1);
//   Template.fromJSON(stack).resourceCountIs('AWS::IAM::Policy', 1);
//   Template.fromJSON(stack).resourceCountIs('AWS::AppSync::DataSource', 1);
//   Template.fromJSON(stack).resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
//   Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 2);
// });

// test('two @function directives for the same field should be valid', () => {
//   const validSchema = `
//     type Query {
//         echo(msg: String): String @function(name: "echofunction-\${env}") @function(name: "otherfunction")
//     }
//     `;

//   const out = transformAndSynth(validSchema);
//   const stacks = out.getCloudFormationTemplates();
//   expect(stacks).toBeDefined();
//   const stack = (stacks as any).FunctionDirectiveStack;
//   expect(stack).toBeDefined();
//   Template.fromJSON(stack).resourceCountIs('AWS::AppSync::Resolver', 1);
//   Template.fromJSON(stack).hasResourceProperties('AWS::AppSync::Resolver', {
//     ApiId: { Ref: Match.anyValue() },
//     FieldName: 'echo',
//     TypeName: 'Query',
//     Kind: 'PIPELINE',
//     PipelineConfig: {
//       Functions: [{ 'Fn::GetAtt': [Match.anyValue(), 'FunctionId'] }, { 'Fn::GetAtt': [Match.anyValue(), 'FunctionId'] }],
//     },
//   });
// });

// test('@function directive applied to Object should throw Error', () => {
//   const invalidSchema = `
//     type Query @function(name: "echofunction-\${env}") {
//         echo(msg: String): String @function(name: "echofunction-\${env}")
//     }
//     `;

//   expect(() => transformAndSynth(invalidSchema)).toThrow('Directive "@function" may not be used on OBJECT.');
// });

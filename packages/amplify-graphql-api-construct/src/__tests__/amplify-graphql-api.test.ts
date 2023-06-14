import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphQlApi } from '../amplify-graphql-api';
import { ConflictHandlerType } from '@aws-amplify/graphql-transformer-core';

describe('AmplifyGraphQlApi', () => {
  it('renders an appsync api', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphQlApi(stack, 'TestApi', {
      apiName: 'MyApi',
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `,
      authorizationConfig: {
        userPoolConfig: { userPool },
      },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: {
        'Fn::Join': [
          '',
          Match.arrayWith(['MyApi']),
        ],
      },
    });

    template.resourceCountIs('AWS::AppSync::DataSource', 1);
    template.hasResourceProperties('AWS::AppSync::DataSource', {
      Name: 'NONE_DS',
      Type: 'NONE',
    });
  });

  it('renders a conflict resolution table when enabled', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphQlApi(stack, 'TestApi', {
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `,
      authorizationConfig: {
        userPoolConfig: { userPool },
      },
      resolverConfig: {
        project: {
          ConflictDetection: 'VERSION',
          ConflictHandler: ConflictHandlerType.OPTIMISTIC,
        },
      },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        {
          AttributeName: 'ds_pk',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'ds_sk',
          KeyType: 'RANGE',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: "ds_pk",
          AttributeType: "S"
        },
        {
          AttributeName: "ds_sk",
          AttributeType: "S"
        }
      ],
    });
  });
  
  it('uses the id in place of apiName when not specified', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphQlApi(stack, 'TestApi', {
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `,
      authorizationConfig: {
        userPoolConfig: { userPool },
      },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: {
        'Fn::Join': [
          '',
          Match.arrayWith(['TestApi']),
        ],
      },
    });
  });
});

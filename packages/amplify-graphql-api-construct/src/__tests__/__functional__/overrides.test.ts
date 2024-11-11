import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('overrides', () => {
  it('allows custom DDB table name on amplify managed tables', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      apiName: 'MyApi',
      definition: AmplifyGraphqlDefinition.fromString(
        /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: owner }]) {
            description: String!
          }
        `,
        DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
      ),
      authorizationModes: {
        userPoolConfig: { userPool },
      },
    });

    api.resources.cfnResources.amplifyDynamoDbTables['Todo'].tableName = 'CustomTableName';

    const {
      resources: {
        nestedStacks: { AmplifyTableManager, Todo },
      },
    } = api;

    const todoTemplate = Template.fromStack(Todo);
    todoTemplate.hasResourceProperties('Custom::AmplifyDynamoDBTable', {
      tableName: 'CustomTableName',
    });

    const tableManagerTemplate = Template.fromStack(AmplifyTableManager);

    const action = [
      'dynamodb:CreateTable',
      'dynamodb:UpdateTable',
      'dynamodb:DeleteTable',
      'dynamodb:DescribeTable',
      'dynamodb:DescribeContinuousBackups',
      'dynamodb:DescribeTimeToLive',
      'dynamodb:UpdateContinuousBackups',
      'dynamodb:UpdateTimeToLive',
      'dynamodb:TagResource',
      'dynamodb:UntagResource',
      'dynamodb:ListTagsOfResource',
    ];

    tableManagerTemplate.hasResourceProperties('AWS::IAM::Role', {
      Policies: [
        {
          PolicyDocument: {
            Statement: Match.arrayWith([
              {
                Action: action,
                Effect: 'Allow',
                Resource: {
                  'Fn::Sub': Match.arrayWith([
                    // this is the template string within the CFN template
                    // eslint-disable-next-line no-template-curly-in-string
                    'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/*-${apiId}-${envName}',
                  ]),
                },
              },
            ]),
          },
          PolicyName: 'CreateUpdateDeleteTablesPolicy',
        },
      ],
    });

    tableManagerTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: action,
            Effect: 'Allow',
            Resource: {
              'Fn::Sub': [
                // this is the template string within the CFN template
                // eslint-disable-next-line no-template-curly-in-string
                'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tableName}',
                { tableName: 'CustomTableName' },
              ],
            },
          },
        ],
      },
      PolicyName: Match.stringLikeRegexp('^AmplifyManagedTableIsCompleteRoleDefaultPolicy.*'),
      Roles: [
        {
          Ref: Match.stringLikeRegexp('^AmplifyManagedTableIsCompleteRole.*'),
        },
      ],
    });
    tableManagerTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'states:StartExecution',
            Effect: 'Allow',
            Resource: {
              Ref: Match.stringLikeRegexp('^AmplifyTableWaiterStateMachine.*'),
            },
          },
          {
            Action: action,
            Effect: 'Allow',
            Resource: {
              'Fn::Sub': [
                // this is the template string within the CFN template
                // eslint-disable-next-line no-template-curly-in-string
                'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${tableName}',
                { tableName: 'CustomTableName' },
              ],
            },
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: Match.stringLikeRegexp('^AmplifyManagedTableOnEventRoleDefaultPolicy.*'),
      Roles: [
        {
          Ref: Match.stringLikeRegexp('^AmplifyManagedTableOnEventRole.*'),
        },
      ],
    });
  });
});

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('custom resolver', () => {
  it('adds a custom query resolver', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphqlApi(stack, 'TestApi', {
      apiName: 'MyApi',
      // TODO: update entry
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Query {
          getFoo(bar: Int): String @resolver(functions: [{ dataSource: "NONE", entry: "src/__tests__/__functional__/handler.js" }])
        }
      `),
      authorizationModes: {
        userPoolConfig: { userPool },
      },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::AppSync::FunctionConfiguration', 1);
    template.hasResourceProperties('AWS::AppSync::FunctionConfiguration', {
      // TODO: add more properties
      DataSourceName: 'NONE',
      Name: 'Fn_Query_getFoo_1',
      Runtime: {
        Name: 'APPSYNC_JS',
        RuntimeVersion: '1.0.0',
      },
    });

    template.resourceCountIs('AWS::AppSync::Resolver', 1);
    template.hasResourceProperties('AWS::AppSync::Resolver', {
      // TODO: add more properties
      FieldName: 'getFoo',
      Kind: 'PIPELINE',
      Runtime: {
        Name: 'APPSYNC_JS',
        RuntimeVersion: '1.0.0',
      },
      TypeName: 'Query',
    });
  });
});

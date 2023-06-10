import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphQlApi } from '../amplify-graphql-api';

describe('AmplifyGraphQlApi', () => {
  it('transforms a simple schema', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphQlApi(stack, 'TestApi', {
      apiName: 'TestApi',
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `,
      authorizationModes: [
        { type: 'AMAZON_COGNITO_USER_POOLS', userPool },
      ],
    });

    const template = Template.fromStack(stack);
    // expect(template.toJSON()).toMatchSnapshot();
  });
});

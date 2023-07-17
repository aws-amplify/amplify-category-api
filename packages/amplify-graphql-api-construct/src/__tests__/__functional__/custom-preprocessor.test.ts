import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyApiSchemaPreprocessorOutput } from '../../types';

describe('custom preprocessor functionality', () => {
  it('renders an appsync api with custom schema type and preprocessor', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    new AmplifyGraphqlApi(stack, 'TestApi', {
      schema: 3,
      schemaPreprocessor: (unprocessedSchema: number): AmplifyApiSchemaPreprocessorOutput => {
        switch (unprocessedSchema) {
          case 1:
            return {
              processedSchema: /* GraphQL */ `
                type Todo @model @auth(rules: [{ allow: owner }]) {
                  description: String!
                }
              `,
            };
          case 2:
            return {
              processedSchema: /* GraphQL */ `
                type Blog @model @auth(rules: [{ allow: owner }]) {
                  description: String!
                }
              `,
            };
          case 3:
            return {
              processedSchema: /* GraphQL */ `
                type Post @model @auth(rules: [{ allow: owner }]) {
                  description: String!
                }
              `,
            };
          default:
            throw new Error('Invalid schema');
        }
      },
      authorizationConfig: {
        userPoolConfig: { userPool },
      },
    });
  });
});

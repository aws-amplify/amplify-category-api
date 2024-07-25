import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('exposed api properties', () => {
  it('allows access to the graphql and realtime urls', () => {
    const api = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    expect(api.graphqlUrl).toBeDefined();
    expect(api.realtimeUrl).toBeDefined();
  });

  it('exposes the api key if defined', () => {
    const api = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    expect(api.apiKey).toBeDefined();
  });

  it('does not expose the api key if not defined', () => {
    const stack = new cdk.Stack();

    const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: owner }]) {
          description: String!
        }
      `),
      authorizationModes: {
        userPoolConfig: { userPool },
      },
    });

    expect(api.apiKey).not.toBeDefined();
  });

  it('exposes the api id', () => {
    const stack = new cdk.Stack();

    const api = new AmplifyGraphqlApi(stack, 'TestApi', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    expect(api.apiId).toBeDefined();
  });
});

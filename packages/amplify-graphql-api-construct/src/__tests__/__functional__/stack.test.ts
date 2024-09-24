import * as cdk from 'aws-cdk-lib';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('stack parameter access and verification', () => {
  it('allows access to stack parameter', () => {
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

    expect(api.stack).toBeDefined();
  });

  it('verifies the stack property is set to the expected value', () => {
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

    expect(api.stack).toBe(cdk.Stack.of(api));
  });
});
import * as cdk from 'aws-cdk-lib';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('stack parameter access and verification', () => {
  it('verifies the stack property is accessible and set to the expected value', () => {
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

    expect(api.stack).toBe(stack);
  });
});
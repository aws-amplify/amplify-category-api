import * as cdk from 'aws-cdk-lib';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { Construct } from 'constructs';
import { AmplifyGraphqlApiProps } from '../../types';

class CustomL3Construct extends Construct {
  data: AmplifyGraphqlApi;
  constructor(scope: Construct, id: string, props: AmplifyGraphqlApiProps) {
    super(scope, id);
    this.data = new AmplifyGraphqlApi(scope, 'data-test', props);
  }
}

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

  it('verifies stack refers to parent stack of data construct', () => {
    const stack = new cdk.Stack();
    const customConstruct = new CustomL3Construct(stack, 'test', {
      definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: cdk.Duration.days(7) },
      },
    });

    expect(customConstruct.data.stack).toBe(stack);
  });
});

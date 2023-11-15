import { Stack, Duration } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyData, AmplifyDataDefinition } from '..';

describe('AmplifyData', () => {
  it('can be invoked', () => {
    const stack = new Stack();

    new AmplifyData(stack, 'TestApi', {
      definition: AmplifyDataDefinition.fromString(/* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }
      `),
      authorizationModes: {
        apiKeyConfig: { expires: Duration.days(7) },
      },
    });

    Template.fromStack(stack).hasResourceProperties('AWS::AppSync::GraphQLApi', { Name: 'TestApi' });
  });
});

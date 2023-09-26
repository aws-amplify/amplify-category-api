import * as cdk from 'aws-cdk-lib';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('AmplifyGraphqlApi', () => {
  describe('getGeneratedFunctionSlots', () => {
    it('returns slots, and includes a known slot', () => {
      const { generatedFunctionSlots } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      expect(generatedFunctionSlots.length).toEqual(20);
      expect(generatedFunctionSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            typeName: 'Mutation',
            fieldName: 'createTodo',
            slotName: 'postAuth',
            slotIndex: 1,
            function: expect.objectContaining({
              requestMappingTemplate: expect.any(String),
            }),
          }),
        ]),
      );
    });
  });
});

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
    it('returns both table interface and L1 table construct(amplifyTable) when using amplify table strategy', () => {
      const { resources } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(
          /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `,
          {
            dbType: 'DYNAMODB',
            provisionStrategy: 'AMPLIFY_TABLE',
          },
        ),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });
      expect(resources.cfnResources.amplifyDynamoDbTables['Todo']).toBeDefined();
      expect(resources.tables['Todo']).toBeDefined();
      expect(resources.cfnResources.cfnTables['Todo']).toBeUndefined();
    });
    it('returns both table interface and L1 table construct(cfnTable) when using default DDB strategy', () => {
      const { resources } = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(
          /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `,
          {
            dbType: 'DYNAMODB',
            provisionStrategy: 'DEFAULT',
          },
        ),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });
      expect(resources.cfnResources.cfnTables['Todo']).toBeDefined();
      expect(resources.tables['Todo']).toBeDefined();
      expect(resources.cfnResources.amplifyDynamoDbTables['Todo']).toBeUndefined();
    });
  });
});

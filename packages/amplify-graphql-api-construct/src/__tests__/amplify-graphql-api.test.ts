import * as cdk from 'aws-cdk-lib';
import { AmplifyGraphqlApi } from '../amplify-graphql-api';

describe('AmplifyGraphqlApi', () => {
  describe('getGeneratedFunctionSlots', () => {
    it('returns slots, and includes a known slot', () => {
      const api = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        schema: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `,
        authorizationConfig: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      const generatedFunctionSlots = api.getGeneratedFunctionSlots();

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

  describe('storeOutput', () => {
    const tokenRegex = /\$\{Token\[TOKEN\.\d+\]\}/;
    const awsRegionTokenRegex = /\$\{Token\[AWS\.Region\.\d+\]\}/;

    test('stores output with outputStorageStrategy', () => {
      const api = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        schema: /* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `,
        authorizationConfig: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });

      const addBackendOutputEntry = jest.fn();
      const outputStorageStrategyMock = {
        addBackendOutputEntry,
        flush: jest.fn(),
      };
      api.storeOutput(outputStorageStrategyMock);
      expect(addBackendOutputEntry).toBeCalledTimes(1);
      expect(addBackendOutputEntry).toBeCalledWith('graphqlOutput', {
        version: '1',
        payload: {
          awsAppsyncApiEndpoint: expect.stringMatching(tokenRegex),
          awsAppsyncApiKey: expect.stringMatching(tokenRegex),
          awsAppsyncAuthenticationType: 'API_KEY',
          awsAppsyncRegion: expect.stringMatching(awsRegionTokenRegex),
        },
      });
    });

    test('does not store awsAppsyncApiKey when not present and changes awsAppsyncAuthenticationType', () => {
      const api = new AmplifyGraphqlApi(new cdk.Stack(), 'TestApi', {
        schema: /* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `,
        authorizationConfig: {
          oidcConfig: {
            oidcProviderName: 'mock-provider-name',
            oidcIssuerUrl: 'mock-issuer-url',
            tokenExpiryFromAuth: cdk.Duration.days(1),
            tokenExpiryFromIssue: cdk.Duration.days(1),
          },
        },
      });

      const addBackendOutputEntry = jest.fn();
      const outputStorageStrategyMock = {
        addBackendOutputEntry,
        flush: jest.fn(),
      };
      api.storeOutput(outputStorageStrategyMock);
      expect(addBackendOutputEntry).toBeCalledTimes(1);
      expect(addBackendOutputEntry).toBeCalledWith('graphqlOutput', {
        version: '1',
        payload: {
          awsAppsyncApiEndpoint: expect.stringMatching(tokenRegex),
          awsAppsyncAuthenticationType: 'OPENID_CONNECT',
          awsAppsyncRegion: expect.stringMatching(awsRegionTokenRegex),
        },
      });
    });
  });
});

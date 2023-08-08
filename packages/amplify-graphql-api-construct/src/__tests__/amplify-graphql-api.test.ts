import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
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
    describe('default outputStorageStrategy', () => {
      test('stores output with outputStorageStrategy', () => {
        const stack = new cdk.Stack();
        new AmplifyGraphqlApi(stack, 'TestApi', {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `,
          authorizationConfig: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
        });
        const template = Template.fromStack(stack);

        expect(template.toJSON().Metadata).toMatchInlineSnapshot(`
          Object {
            "AWS::Amplify::Output": Object {
              "graphqlOutput": Object {
                "stackOutputs": Array [
                  "awsAppsyncApiEndpoint",
                  "awsAppsyncAuthenticationType",
                  "awsAppsyncRegion",
                  "awsAppsyncApiKey",
                ],
                "version": "1",
              },
            },
          }
        `);
        template.hasOutput(
          'awsAppsyncApiEndpoint',
          Match.exact({
            Value: {
              'Fn::GetAtt': ['GraphQLAPI', 'GraphQLUrl'],
            },
          }),
        );
        template.hasOutput(
          'awsAppsyncAuthenticationType',
          Match.exact({
            Value: 'API_KEY',
          }),
        );
        template.hasOutput(
          'awsAppsyncRegion',
          Match.exact({
            Value: {
              Ref: 'AWS::Region',
            },
          }),
        );
        template.hasOutput(
          'awsAppsyncApiKey',
          Match.exact({
            Value: {
              'Fn::GetAtt': ['GraphQLAPIDefaultApiKey215A6DD7', 'ApiKey'],
            },
          }),
        );
      });
    });

    describe('custom outputStorageStrategy', () => {
      const tokenRegex = /\$\{Token\[TOKEN\.\d+\]\}/;
      const awsRegionTokenRegex = /\$\{Token\[AWS\.Region\.\d+\]\}/;

      const addBackendOutputEntry = jest.fn();
      const flush = jest.fn();
      const outputStorageStrategy = {
        addBackendOutputEntry,
        flush,
      };

      afterEach(() => {
        addBackendOutputEntry.mockReset();
        flush.mockReset();
      });

      test('stores output with outputStorageStrategy', () => {
        const stack = new cdk.Stack();
        new AmplifyGraphqlApi(stack, 'TestApi', {
          schema: /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `,
          authorizationConfig: {
            apiKeyConfig: { expires: cdk.Duration.days(7) },
          },
          outputStorageStrategy,
        });

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
        expect(flush).not.toBeCalled();
      });

      test('does not store awsAppsyncApiKey when not present and changes awsAppsyncAuthenticationType', () => {
        const stack = new cdk.Stack();
        new AmplifyGraphqlApi(stack, 'TestApi', {
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
          outputStorageStrategy,
        });

        const template = Template.fromStack(stack);
        expect(addBackendOutputEntry).toBeCalledTimes(1);
        expect(addBackendOutputEntry).toBeCalledWith('graphqlOutput', {
          version: '1',
          payload: {
            awsAppsyncApiEndpoint: expect.stringMatching(tokenRegex),
            awsAppsyncAuthenticationType: 'OPENID_CONNECT',
            awsAppsyncRegion: expect.stringMatching(awsRegionTokenRegex),
          },
        });
        expect(flush).not.toBeCalled();
      });
    });
  });
});

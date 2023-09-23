import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlSchema } from '../../amplify-graphql-schema';

describe('storeOutput', () => {
  describe('default outputStorageStrategy', () => {
    test('stores output with outputStorageStrategy', () => {
      const stack = new cdk.Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        schema: AmplifyGraphqlSchema.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationConfig: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);

      expect(template.toJSON().Metadata).toMatchInlineSnapshot(`
        Object {
          "AWS::Amplify::GraphQL": Object {
            "stackOutputs": Array [
              "awsAppsyncApiId",
              "awsAppsyncApiEndpoint",
              "awsAppsyncAuthenticationType",
              "awsAppsyncRegion",
              "amplifyApiModelSchemaS3Uri",
              "awsAppsyncApiKey",
            ],
            "version": "1",
          },
        }
      `);
      template.hasOutput(
        'awsAppsyncApiEndpoint',
        Match.exact({
          Value: {
            'Fn::GetAtt': [Object.keys(template.findResources('AWS::AppSync::GraphQLApi'))[0], 'GraphQLUrl'],
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
            'Fn::GetAtt': [Object.keys(template.findResources('AWS::AppSync::ApiKey'))[0], 'ApiKey'],
          },
        }),
      );
    });
  });

  describe('custom outputStorageStrategy', () => {
    const tokenRegex = /\$\{Token\[TOKEN\.\d+\]\}/;
    const awsRegionTokenRegex = /\$\{Token\[AWS\.Region\.\d+\]\}/;
    const s3UriTokenRegex = /s3:\/\/\$\{Token\[TOKEN\.\d+\]\}\/.*/;

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
        schema: AmplifyGraphqlSchema.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationConfig: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
        outputStorageStrategy,
      });

      expect(addBackendOutputEntry).toBeCalledTimes(1);
      expect(addBackendOutputEntry).toBeCalledWith(graphqlOutputKey, {
        version: '1',
        payload: {
          awsAppsyncApiEndpoint: expect.stringMatching(tokenRegex),
          awsAppsyncApiId: expect.stringMatching(tokenRegex),
          awsAppsyncApiKey: expect.stringMatching(tokenRegex),
          awsAppsyncAuthenticationType: 'API_KEY',
          awsAppsyncRegion: expect.stringMatching(awsRegionTokenRegex),
          amplifyApiModelSchemaS3Uri: expect.stringMatching(s3UriTokenRegex),
        },
      });
      expect(flush).not.toBeCalled();
    });

    test('does not store awsAppsyncApiKey when not present and changes awsAppsyncAuthenticationType', () => {
      const stack = new cdk.Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        schema: AmplifyGraphqlSchema.fromString(/* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `),
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

      expect(addBackendOutputEntry).toBeCalledTimes(1);
      expect(addBackendOutputEntry).toBeCalledWith(graphqlOutputKey, {
        version: '1',
        payload: {
          awsAppsyncApiId: expect.stringMatching(tokenRegex),
          awsAppsyncApiEndpoint: expect.stringMatching(tokenRegex),
          awsAppsyncAuthenticationType: 'OPENID_CONNECT',
          awsAppsyncRegion: expect.stringMatching(awsRegionTokenRegex),
          amplifyApiModelSchemaS3Uri: expect.stringMatching(s3UriTokenRegex),
        },
      });
      expect(flush).not.toBeCalled();
    });
  });
});

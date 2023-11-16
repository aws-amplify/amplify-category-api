import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { ArnPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('storeOutput', () => {
  describe('default outputStorageStrategy', () => {
    test('stores output with outputStorageStrategy', () => {
      const stack = new cdk.Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          defaultAuthorizationMode: 'API_KEY',
          apiKeyConfig: { expires: cdk.Duration.days(7) },
          iamConfig: {
            identityPoolId: 'abc',
            unauthenticatedUserRole: new Role(stack, 'testUnauthRole', {
              assumedBy: new ArnPrincipal('aws:iam::1234:root'),
            }),
            authenticatedUserRole: new Role(stack, 'testAuthRole', {
              assumedBy: new ArnPrincipal('aws:iam::1234:root'),
            }),
          },
          userPoolConfig: {
            userPool: new UserPool(stack, 'testUserPool'),
          },
        },
        conflictResolution: {
          project: {
            handlerType: 'AUTOMERGE',
            detectionType: 'NONE',
          },
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
              "awsAppsyncAdditionalAuthenticationTypes",
              "awsAppsyncConflictResolutionMode",
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
    const outputStorageStrategy = {
      addBackendOutputEntry,
    };

    afterEach(() => {
      addBackendOutputEntry.mockReset();
    });

    test('stores output with outputStorageStrategy', () => {
      const stack = new cdk.Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
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
    });

    test('does not store awsAppsyncApiKey when not present and changes awsAppsyncAuthenticationType', () => {
      const stack = new cdk.Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `),
        authorizationModes: {
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
    });
  });

  describe('BI metrics output', () => {
    it('stores expected BI metadata in stack description', () => {
      const stack = new cdk.Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: {
            expires: cdk.Duration.days(2),
          },
        },
      });
      const { version } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf-8')) as {
        version: string;
      };
      expect(JSON.parse(stack.templateOptions.description || '{}')).toMatchObject({ createdWith: version, stackType: 'api-AppSync' });
    });

    /**
     * This test is testing a dependency more than it's testing code in this package,
     * but it's still good to verify that the expected CDK context key is being respected
     */
    it('stores expected BI metadata when Amplify context key is set', () => {
      const stack = new cdk.Stack();
      stack.node.setContext('amplify-backend-type', 'branch');
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: {
            expires: cdk.Duration.days(2),
          },
        },
      });
      expect(JSON.parse(stack.templateOptions.description || '{}')).toMatchObject({ createdBy: 'AmplifyPipelineDeploy' });
    });
  });
});

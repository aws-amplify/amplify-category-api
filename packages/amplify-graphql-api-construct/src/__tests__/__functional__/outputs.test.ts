import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { mockSqlDataSourceStrategy, SCHEMAS } from '@aws-amplify/graphql-transformer-test-utils';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { ArnPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import * as path from 'path';
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
    it('stores expected BI metadata in stack description for a default definition', () => {
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
      expect(JSON.parse(stack.templateOptions.description || '{}')).toMatchObject({
        createdWith: version,
        stackType: 'api-AppSync',
        metadata: { dataSources: 'dynamodb' },
      });
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
      expect(JSON.parse(stack.templateOptions.description || '{}')).toMatchObject({
        createdBy: 'AmplifyPipelineDeploy',
        metadata: { dataSources: 'dynamodb' },
      });
    });

    it('stores expected BI metadata for dynamodb data sources regardless of provisioning strategy', () => {
      const ddbDefaultDefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
      const ddbManagedDefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);
      const stack = new cdk.Stack();
      stack.node.setContext('amplify-backend-type', 'branch');
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.combine([ddbDefaultDefinition, ddbManagedDefinition]),
        authorizationModes: {
          apiKeyConfig: {
            expires: cdk.Duration.days(2),
          },
        },
      });
      expect(JSON.parse(stack.templateOptions.description || '{}')).toMatchObject({
        createdBy: 'AmplifyPipelineDeploy',
        metadata: { dataSources: 'dynamodb' },
      });
    });

    it('stores expected BI metadata for mysql data sources', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlStrategy1' });
      const sqlDefinition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlStrategy2' });
      const sqlDefinition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.sql, sqlStrategy2);
      const stack = new cdk.Stack();
      stack.node.setContext('amplify-backend-type', 'branch');
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.combine([sqlDefinition1, sqlDefinition2]),
        authorizationModes: {
          apiKeyConfig: {
            expires: cdk.Duration.days(2),
          },
        },
      });
      expect(JSON.parse(stack.templateOptions.description || '{}')).toMatchObject({
        createdBy: 'AmplifyPipelineDeploy',
        metadata: { dataSources: 'mysql' },
      });
    });

    it('stores expected BI metadata for postgres data sources', () => {
      const sqlStrategy1 = mockSqlDataSourceStrategy({ name: 'sqlStrategy1', dbType: 'POSTGRES' });
      const sqlDefinition1 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.sql, sqlStrategy1);
      const sqlStrategy2 = mockSqlDataSourceStrategy({ name: 'sqlStrategy2', dbType: 'POSTGRES' });
      const sqlDefinition2 = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.sql, sqlStrategy2);
      const stack = new cdk.Stack();
      stack.node.setContext('amplify-backend-type', 'branch');
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.combine([sqlDefinition1, sqlDefinition2]),
        authorizationModes: {
          apiKeyConfig: {
            expires: cdk.Duration.days(2),
          },
        },
      });
      expect(JSON.parse(stack.templateOptions.description || '{}')).toMatchObject({
        createdBy: 'AmplifyPipelineDeploy',
        metadata: { dataSources: 'postgres' },
      });
    });

    it('stores expected BI metadata for heterogeneous data sources', () => {
      const ddbDefaultDefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo.ddb);
      const ddbManagedDefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo2.ddb, DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY);

      const mysqlStrategy = mockSqlDataSourceStrategy({ name: 'mysqlStrategy', dbType: 'MYSQL' });
      const mysqlDefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo3.sql, mysqlStrategy);

      const postgresStrategy = mockSqlDataSourceStrategy({ name: 'postgresStrategy', dbType: 'POSTGRES' });
      const postgresDefinition = AmplifyGraphqlDefinition.fromString(SCHEMAS.todo4.sql, postgresStrategy);

      const stack = new cdk.Stack();
      stack.node.setContext('amplify-backend-type', 'branch');
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.combine([ddbDefaultDefinition, ddbManagedDefinition, mysqlDefinition, postgresDefinition]),
        authorizationModes: {
          apiKeyConfig: {
            expires: cdk.Duration.days(2),
          },
        },
      });
      expect(JSON.parse(stack.templateOptions.description || '{}')).toMatchObject({
        createdBy: 'AmplifyPipelineDeploy',
        metadata: { dataSources: 'dynamodb,mysql,postgres' },
      });
    });
  });
});

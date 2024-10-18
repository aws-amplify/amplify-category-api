import * as path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import { ArnPrincipal, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnIdentityPool, UserPool } from 'aws-cdk-lib/aws-cognito';
import { Template } from 'aws-cdk-lib/assertions';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { mockSqlDataSourceStrategy } from '@aws-amplify/graphql-transformer-test-utils';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

describe('metrics metadata', () => {
  describe('dataSources', () => {
    test('default dynamodb', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key",
          "customOperations": "",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('amplify managed dynamodb', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
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
          apiKeyConfig: { expires: Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key",
          "customOperations": "",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('mysql', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(
          /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID! @primaryKey
              description: String!
            }
          `,
          mockSqlDataSourceStrategy({ dbType: 'MYSQL' }),
        ),
        authorizationModes: {
          apiKeyConfig: { expires: Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key",
          "customOperations": "",
          "dataSources": "mysql",
        }
      `);
    });

    test('postgres', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(
          /* GraphQL */ `
            type Todo @model @auth(rules: [{ allow: public }]) {
              id: ID! @primaryKey
              description: String!
            }
          `,
          mockSqlDataSourceStrategy({ dbType: 'POSTGRES' }),
        ),
        authorizationModes: {
          apiKeyConfig: { expires: Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key",
          "customOperations": "",
          "dataSources": "postgres",
        }
      `);
    });

    test('dynamodb, mysql, and postgres', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.combine([
          AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type TodoDynamoDB @model @auth(rules: [{ allow: public }]) {
              description: String!
            }
          `),
          AmplifyGraphqlDefinition.fromString(
            /* GraphQL */ `
              type TodoMySQL @model @auth(rules: [{ allow: public }]) {
                id: ID! @primaryKey
                description: String!
              }
            `,
            mockSqlDataSourceStrategy({ dbType: 'MYSQL' }),
          ),
          AmplifyGraphqlDefinition.fromString(
            /* GraphQL */ `
              type TodoPostgres @model @auth(rules: [{ allow: public }]) {
                id: ID! @primaryKey
                description: String!
              }
            `,
            mockSqlDataSourceStrategy({ dbType: 'POSTGRES' }),
          ),
        ]),
        authorizationModes: {
          apiKeyConfig: { expires: Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key",
          "customOperations": "",
          "dataSources": "dynamodb,mysql,postgres",
        }
      `);
    });
  });

  describe('authorizationModes', () => {
    test('AWS_IAM', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: iam, allow: public }, { provider: iam, allow: private }]) {
            description: String!
          }
        `),
        authorizationModes: {
          iamConfig: {
            identityPoolId: 'abc',
            unauthenticatedUserRole: new Role(stack, 'testUnauthRole', {
              assumedBy: new ArnPrincipal('aws:iam::1234:root'),
            }),
            authenticatedUserRole: new Role(stack, 'testAuthRole', {
              assumedBy: new ArnPrincipal('aws:iam::1234:root'),
            }),
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "aws_iam",
          "customOperations": "",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('AMAZON_COGNITO_USER_POOLS', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: owner }]) {
            description: String!
          }
        `),
        authorizationModes: {
          userPoolConfig: {
            userPool: new UserPool(stack, 'testUserPool'),
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "amazon_cognito_user_pools",
          "customOperations": "",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('API_KEY', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key",
          "customOperations": "",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('AWS_LAMBDA', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: function, allow: custom }]) {
            description: String!
          }
        `),
        authorizationModes: {
          lambdaConfig: {
            function: new NodejsFunction(stack, 'TestAuthorizer', { entry: path.join(__dirname, 'authorizer.ts') }),
            ttl: Duration.days(7),
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "aws_lambda",
          "customOperations": "",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('OPENID_CONNECT', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: oidc, allow: owner }]) {
            description: String!
          }
        `),
        authorizationModes: {
          oidcConfig: {
            oidcProviderName: 'testProvider',
            oidcIssuerUrl: 'https://test.client/',
            clientId: 'testClient',
            tokenExpiryFromAuth: Duration.minutes(5),
            tokenExpiryFromIssue: Duration.minutes(5),
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "openid_connect",
          "customOperations": "",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('AMAZON_COGNITO_IDENTITY_POOLS', () => {
      const stack = new Stack();
      const identityPool = new CfnIdentityPool(stack, 'TestIdentityPool', { allowUnauthenticatedIdentities: true });
      const appsync = new ServicePrincipal('appsync.amazonaws.com');
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: iam, allow: public }, { provider: iam, allow: private }]) {
            description: String!
          }
        `),
        authorizationModes: {
          identityPoolConfig: {
            identityPoolId: identityPool.logicalId,
            authenticatedUserRole: new Role(stack, 'AuthRole', { assumedBy: appsync }),
            unauthenticatedUserRole: new Role(stack, 'UnauthRole', { assumedBy: appsync }),
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "amazon_cognito_identity_pools",
          "customOperations": "",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('multiple', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo
            @model
            @auth(
              rules: [
                { allow: public }
                { provider: iam, allow: public }
                { provider: iam, allow: private }
                { provider: function, allow: custom }
              ]
            ) {
            description: String!
          }
        `),
        authorizationModes: {
          defaultAuthorizationMode: 'API_KEY',
          apiKeyConfig: { expires: Duration.days(7) },
          iamConfig: {
            identityPoolId: 'abc',
            unauthenticatedUserRole: new Role(stack, 'testUnauthRole', {
              assumedBy: new ArnPrincipal('aws:iam::1234:root'),
            }),
            authenticatedUserRole: new Role(stack, 'testAuthRole', {
              assumedBy: new ArnPrincipal('aws:iam::1234:root'),
            }),
          },
          lambdaConfig: {
            function: new NodejsFunction(stack, 'TestAuthorizer', { entry: path.join(__dirname, 'authorizer.ts') }),
            ttl: Duration.days(7),
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key,aws_iam,aws_lambda",
          "customOperations": "",
          "dataSources": "dynamodb",
        }
      `);
    });
  });

  describe('customOperations', () => {
    test('queries', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }

          type Query {
            getCustomTodos: [Todo]
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key",
          "customOperations": "queries",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('mutations', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }

          type Mutation {
            addCustomTodo: Todo
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key",
          "customOperations": "mutations",
          "dataSources": "dynamodb",
        }
      `);
    });

    test('mutations and queries', () => {
      const stack = new Stack();
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ allow: public }]) {
            description: String!
          }

          type Mutation {
            addCustomTodo: Todo
          }

          type Query {
            getCustomTodos: [Todo]
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: Duration.days(7) },
        },
      });
      const template = Template.fromStack(stack);
      expect(JSON.parse(template.toJSON().Description).metadata).toMatchInlineSnapshot(`
        Object {
          "authorizationModes": "api_key",
          "customOperations": "queries,mutations",
          "dataSources": "dynamodb",
        }
      `);
    });
  });
});

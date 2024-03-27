import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';

/**
 * Utility to wrap construct creation a basic synth step to smoke test
 * @param buildApp callback to create the resources in the stack
 */
const verifySynth = (buildApp: (stack: cdk.Stack) => void): void => {
  const stack = new cdk.Stack();
  buildApp(stack);
  Template.fromStack(stack);
};

describe('auth modes', () => {
  it('synths with api key auth', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: apiKey, allow: public }]) {
            description: String!
          }
        `),
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });
    });
  });

  it('renders with iam auth for roles', () => {
    verifySynth((stack) => {
      const identityPool = new cognito.CfnIdentityPool(stack, 'TestIdentityPool', { allowUnauthenticatedIdentities: true });
      const appsync = new iam.ServicePrincipal('appsync.amazonaws.com');
      const authenticatedUserRole = new iam.Role(stack, 'AuthRole', { assumedBy: appsync });
      const unauthenticatedUserRole = new iam.Role(stack, 'UnauthRole', { assumedBy: appsync });

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: iam, allow: public }, { provider: iam, allow: private }]) {
            description: String!
          }
        `),
        authorizationModes: {
          iamConfig: {
            identityPoolId: identityPool.logicalId,
            authenticatedUserRole,
            unauthenticatedUserRole,
          },
        },
      });
    });
  });

  it('renders with iam auth for admin roles', () => {
    verifySynth((stack) => {
      const appsync = new iam.ServicePrincipal('appsync.amazonaws.com');
      const authenticatedUserRole = new iam.Role(stack, 'AuthRole', { assumedBy: appsync });
      const unauthenticatedUserRole = new iam.Role(stack, 'UnauthRole', { assumedBy: appsync });

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `),
        authorizationModes: {
          iamConfig: {
            identityPoolId: 'identityPool123',
            authenticatedUserRole,
            unauthenticatedUserRole,
          },
          adminRoles: [authenticatedUserRole],
        },
      });
    });
  });

  it('renders with iam auth and allow listed roles', () => {
    verifySynth((stack) => {
      const appsync = new iam.ServicePrincipal('appsync.amazonaws.com');
      const authenticatedUserRole = new iam.Role(stack, 'AuthRole', { assumedBy: appsync });
      const unauthenticatedUserRole = new iam.Role(stack, 'UnauthRole', { assumedBy: appsync });

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `),
        authorizationModes: {
          iamConfig: {
            identityPoolId: 'identityPool123',
            authenticatedUserRole,
            unauthenticatedUserRole,
            allowListedRoles: [authenticatedUserRole, 'admin2'],
          },
        },
      });
    });
  });

  it('renders with user pool auth', () => {
    verifySynth((stack) => {
      const userPool = cognito.UserPool.fromUserPoolId(stack, 'ImportedUserPool', 'ImportedUserPoolId');

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: userPools, allow: owner }]) {
            description: String!
          }
        `),
        authorizationModes: {
          userPoolConfig: { userPool },
        },
      });
    });
  });

  it('renders with lambda auth', () => {
    verifySynth((stack) => {
      const authFunction = lambda.Function.fromFunctionName(stack, 'ImportedFn', 'ImportedFn');

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: function, allow: custom }]) {
            description: String!
          }
        `),
        authorizationModes: {
          lambdaConfig: {
            function: authFunction,
            ttl: cdk.Duration.minutes(5),
          },
        },
      });
    });
  });

  it('renders with oidc auth', () => {
    verifySynth((stack) => {
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
            tokenExpiryFromAuth: cdk.Duration.minutes(5),
            tokenExpiryFromIssue: cdk.Duration.minutes(5),
          },
        },
      });
    });
  });

  it('renders with identity pool auth', () => {
    verifySynth((stack) => {
      const identityPool = new cognito.CfnIdentityPool(stack, 'TestIdentityPool', { allowUnauthenticatedIdentities: true });
      const appsync = new iam.ServicePrincipal('appsync.amazonaws.com');
      const authenticatedUserRole = new iam.Role(stack, 'AuthRole', { assumedBy: appsync });
      const unauthenticatedUserRole = new iam.Role(stack, 'UnauthRole', { assumedBy: appsync });

      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: iam, allow: public }, { provider: iam, allow: private }]) {
            description: String!
          }
        `),
        authorizationModes: {
          identityPoolConfig: {
            identityPoolId: identityPool.logicalId,
            authenticatedUserRole,
            unauthenticatedUserRole,
          },
        },
      });
    });
  });

  it('renders with IAM access enabled', () => {
    verifySynth((stack) => {
      new AmplifyGraphqlApi(stack, 'TestApi', {
        definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
          type Todo @model @auth(rules: [{ provider: iam, allow: public }, { provider: iam, allow: private }]) {
            description: String!
          }
        `),
        authorizationModes: {
          iamConfig: {
            enableIamAuthorizationMode: true,
          },
        },
      });
    });
  });

  it('throws if deprecated and un-deprecated IAM and identityPool settings are used', () => {
    expect(() => {
      verifySynth((stack) => {
        const identityPool = new cognito.CfnIdentityPool(stack, 'TestIdentityPool', { allowUnauthenticatedIdentities: true });
        const appsync = new iam.ServicePrincipal('appsync.amazonaws.com');
        const authenticatedUserRole = new iam.Role(stack, 'AuthRole', { assumedBy: appsync });
        const unauthenticatedUserRole = new iam.Role(stack, 'UnauthRole', { assumedBy: appsync });

        new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ provider: iam, allow: public }, { provider: iam, allow: private }]) {
              description: String!
            }
          `),
          authorizationModes: {
            iamConfig: {
              identityPoolId: identityPool.logicalId,
              authenticatedUserRole,
              unauthenticatedUserRole,
              enableIamAuthorizationMode: true,
            },
          },
        });
      });
    }).toThrow(
      'Invalid authorization modes configuration provided. ' +
        "Deprecated IAM configuration cannot be used with identity pool configuration or when 'enableIamAuthorizationMode' is specified.",
    );
    expect(() => {
      verifySynth((stack) => {
        const identityPool = new cognito.CfnIdentityPool(stack, 'TestIdentityPool', { allowUnauthenticatedIdentities: true });
        const appsync = new iam.ServicePrincipal('appsync.amazonaws.com');
        const authenticatedUserRole = new iam.Role(stack, 'AuthRole', { assumedBy: appsync });
        const unauthenticatedUserRole = new iam.Role(stack, 'UnauthRole', { assumedBy: appsync });

        new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ provider: iam, allow: public }, { provider: iam, allow: private }]) {
              description: String!
            }
          `),
          authorizationModes: {
            iamConfig: {
              identityPoolId: identityPool.logicalId,
              authenticatedUserRole,
              unauthenticatedUserRole,
            },
            identityPoolConfig: {
              identityPoolId: identityPool.logicalId,
              authenticatedUserRole,
              unauthenticatedUserRole,
            },
          },
        });
      });
    }).toThrow(
      'Invalid authorization modes configuration provided. ' +
        "Deprecated IAM configuration cannot be used with identity pool configuration or when 'enableIamAuthorizationMode' is specified.",
    );
  });

  it('throws if deprecated IAM settings are missing required values', () => {
    expect(() => {
      verifySynth((stack) => {
        const appsync = new iam.ServicePrincipal('appsync.amazonaws.com');
        const authenticatedUserRole = new iam.Role(stack, 'AuthRole', { assumedBy: appsync });
        const unauthenticatedUserRole = new iam.Role(stack, 'UnauthRole', { assumedBy: appsync });

        new AmplifyGraphqlApi(stack, 'TestApi', {
          definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
            type Todo @model @auth(rules: [{ provider: iam, allow: public }, { provider: iam, allow: private }]) {
              description: String!
            }
          `),
          authorizationModes: {
            iamConfig: {
              authenticatedUserRole,
              unauthenticatedUserRole,
            },
          },
        });
      });
    }).toThrow(
      "'authorizationModes.iamConfig.authenticatedUserRole', 'authorizationModes.iamConfig.unauthenticatedUserRole'" +
        " and 'authorizationModes.iamConfig.identityPoolId' must be provided.",
    );
  });
});

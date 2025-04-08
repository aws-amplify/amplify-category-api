#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Role, PolicyDocument, PolicyStatement, ServicePrincipal, Effect } from 'aws-cdk-lib/aws-iam';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IdentityPool, UserPoolAuthenticationProvider } from 'aws-cdk-lib/aws-cognito-identitypool';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import * as path from 'path';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const executionRole = new Role(stack, 'FunctionExecutionRole', {
  assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
  path: '/',
  inlinePolicies: {
    root: new PolicyDocument({
      statements: [
        new PolicyStatement({
          actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
          resources: ['arn:aws:logs:*:*:*'],
          effect: Effect.ALLOW,
        }),
      ],
    }),
  },
});
executionRole.applyRemovalPolicy(RemovalPolicy.DESTROY);

const apiInvoker = new NodejsFunction(stack, 'ApiInvoker', {
  entry: path.join(__dirname, 'apiInvoker.ts'),
  runtime: Runtime.NODEJS_20_X,
  role: executionRole,
  bundling: {
    nodeModules: ['@smithy/util-utf8'], // Force inclusion
  },
});
if (!apiInvoker.role) throw new Error('expected an api invoker role');

// Export the lambda name in order to invoke in tests.
new CfnOutput(stack, 'ApiInvokerFunctionName', {
  value: apiInvoker.functionName,
});

const userPool = new UserPool(stack, 'Userpool');
const userPoolClient = new UserPoolClient(stack, 'UserpoolClient', { userPool });
const identityPool = new IdentityPool(stack, 'Identitypool', {
  authenticationProviders: {
    userPools: [
      new UserPoolAuthenticationProvider({
        userPool: userPool,
        userPoolClient: userPoolClient,
      }),
    ],
  },
});

const api = new AmplifyGraphqlApi(stack, 'TestAdminRoleApi', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      title: String!
    }
  `),
  authorizationModes: {
    defaultAuthorizationMode: 'API_KEY',
    apiKeyConfig: { expires: Duration.days(7) },
    iamConfig: {
      authenticatedUserRole: identityPool.authenticatedRole,
      unauthenticatedUserRole: identityPool.unauthenticatedRole,
      identityPoolId: identityPool.identityPoolId,
    },
    adminRoles: [executionRole],
  },
});

executionRole.addToPolicy(
  new PolicyStatement({
    actions: ['appsync:*'],
    resources: [
      `${api.resources.graphqlApi.arn}`,
      `${api.resources.graphqlApi.arn}/types/*/fields/*`,
      `${api.resources.graphqlApi.arn}/types/*/*/*`,
      `${api.resources.graphqlApi.arn}/types/*`,
      `${api.resources.graphqlApi.arn}/*/*/*/*`,
      `${api.resources.graphqlApi.arn}/*/*/*`,
      `${api.resources.graphqlApi.arn}/*/*`,
      `${api.resources.graphqlApi.arn}/*`,
    ],
    effect: Effect.ALLOW,
  }),
);

apiInvoker.addEnvironment('GRAPHQL_URL', api.graphqlUrl);

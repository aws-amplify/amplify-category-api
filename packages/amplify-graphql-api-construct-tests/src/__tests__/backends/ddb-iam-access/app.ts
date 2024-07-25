#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import { AccountPrincipal, Effect, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const auth = new AmplifyAuth(stack, 'Auth');

if (stack.node.tryGetContext('enable-iam-authorization-mode') === undefined) {
  throw new Error('enable-iam-authorization-mode must be set in CDK context');
}
const enableIamAuthorizationMode = stack.node.tryGetContext('enable-iam-authorization-mode') === 'true';
const api = new AmplifyGraphqlApi(stack, 'DDBBoundApi', {
  apiName: 'MyDDBBoundApi',
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type TodoWithPrivateIam @model @auth(rules: [{ allow: private, provider: iam }]) {
      id: ID!
      description: String!
    }

    type TodoWithPublicIam @model @auth(rules: [{ allow: public, provider: iam }]) {
      id: ID!
      description: String!
    }

    type TodoWithNoAuthDirective @model {
      id: ID!
      description: String!
    }

    type TodoWithPrivateField @model @auth(rules: [{ allow: public, provider: iam }, { allow: private, provider: iam }]) {
      id: ID!
      description: String!
      secret: String @auth(rules: [{ allow: private, provider: iam }])
    }
  `),
  authorizationModes: {
    iamConfig: { enableIamAuthorizationMode },
    identityPoolConfig: {
      identityPoolId: auth.resources.cfnResources.cfnIdentityPool.ref,
      authenticatedUserRole: auth.resources.authenticatedUserIamRole,
      unauthenticatedUserRole: auth.resources.unauthenticatedUserIamRole,
    },
  },
});

const basicRole = new Role(stack, 'BasicRole', {
  assumedBy: new AccountPrincipal(stack.account),
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
basicRole.applyRemovalPolicy(RemovalPolicy.DESTROY);
basicRole.addToPolicy(
  new PolicyStatement({
    actions: ['appsync:GraphQL'],
    resources: [`${api.resources.graphqlApi.arn}/*`],
    effect: Effect.ALLOW,
  }),
);

new CfnOutput(stack, 'BasicRoleArn', { value: basicRole.roleArn });
new CfnOutput(stack, 'isIamAuthorizationModeEnabled', { value: enableIamAuthorizationMode.toString() });

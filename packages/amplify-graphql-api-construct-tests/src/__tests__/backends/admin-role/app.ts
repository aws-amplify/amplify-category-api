#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration } from 'aws-cdk-lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnIdentityPool } from 'aws-cdk-lib/aws-cognito';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const identityPoolId = new CfnIdentityPool(stack, 'TestIdentityPool', { allowUnauthenticatedIdentities: true }).logicalId;
const appsync = new ServicePrincipal('appsync.amazonaws.com');
const authenticatedUserRole = new Role(stack, 'TestAuthRole', { assumedBy: appsync });
const unauthenticatedUserRole = new Role(stack, 'TestUnauthRole', { assumedBy: appsync });
const adminRole = new Role(stack, 'TestAdminRole', { assumedBy: appsync });

new AmplifyGraphqlApi(stack, 'TestAdminRoleApi', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public, provider: apiKey }, { allow: private, provider: iam }]) {
      id: ID!
    }
  `),
  authorizationModes: {
    defaultAuthorizationMode: 'API_KEY',
    iamConfig: { identityPoolId, authenticatedUserRole, unauthenticatedUserRole },
    apiKeyConfig: { expires: Duration.days(7) },
    adminRoles: [adminRole],
  },
});

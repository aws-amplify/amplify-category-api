#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration } from 'aws-cdk-lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { UserPool, CfnIdentityPool } from 'aws-cdk-lib/aws-cognito';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import * as path from 'path';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const userPool = new UserPool(stack, 'TestPool', {});
const identityPoolId = new CfnIdentityPool(stack, 'TestIdentityPool', { allowUnauthenticatedIdentities: true }).ref;
const appsync = new ServicePrincipal('appsync.amazonaws.com');
const authenticatedUserRole = new Role(stack, 'TestAuthRole', { assumedBy: appsync });
const unauthenticatedUserRole = new Role(stack, 'TestUnauthRole', { assumedBy: appsync });
const functionAuthorizer = new NodejsFunction(stack, 'TestAuthorizer', { entry: path.join(__dirname, 'authorizer.ts') });
const oneHour = Duration.hours(1);
const oneWeek = Duration.days(7);
const oidcName = 'my-oidc-provider';
const oidcUrl = 'https://oidc.example.com';

new AmplifyGraphqlApi(stack, 'TestAuthRules', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Todo
      @model
      @auth(
        rules: [
          { allow: public, provider: apiKey }
          { allow: public, provider: iam }
          { allow: owner, ownerField: "userPoolOwner", provider: userPools }
          { allow: owner, ownerField: "oidcOwner", provider: oidc }
          { allow: private, provider: userPools }
          { allow: private, provider: oidc }
          { allow: private, provider: iam }
          { allow: groups, groups: ["Admin"], provider: userPools }
          { allow: groups, groups: ["Admin"], provider: oidc }
          { allow: custom, provider: function }
        ]
      ) {
      id: ID!
    }
  `),
  authorizationModes: {
    defaultAuthorizationMode: 'AWS_IAM',
    iamConfig: { identityPoolId, authenticatedUserRole, unauthenticatedUserRole },
    userPoolConfig: { userPool },
    apiKeyConfig: { expires: oneWeek },
    oidcConfig: { oidcProviderName: oidcName, oidcIssuerUrl: oidcUrl, tokenExpiryFromAuth: oneHour, tokenExpiryFromIssue: oneHour },
    lambdaConfig: { function: functionAuthorizer, ttl: oneHour },
  },
});

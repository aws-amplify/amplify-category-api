#!/usr/bin/env node
import { App, Stack } from 'aws-cdk-lib';
import { CfnIdentityPool } from 'aws-cdk-lib/aws-cognito';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
// @ts-ignore
import { AmplifyData, AmplifyDataDefinition } from '@aws-amplify/data-construct';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const identityPoolId = new CfnIdentityPool(stack, 'TestIdentityPool', { allowUnauthenticatedIdentities: true }).ref;
const appsync = new ServicePrincipal('appsync.amazonaws.com');
const authenticatedUserRole = new Role(stack, 'TestAuthRole', { assumedBy: appsync });
const unauthenticatedUserRole = new Role(stack, 'TestUnauthRole', { assumedBy: appsync });

const functionFieldCount = Number(process.env.FUNCTION_DIRECTIVE_FIELD_COUNT ?? '86');

const functionFields = Array.from(
  { length: functionFieldCount },
  (_, index) => `field${index}: String @function(name: "function${index}-\${env}") @auth(rules: [{ allow: private, provider: iam }])`,
).join('\n');

new AmplifyData(stack, 'FunctionDirectiveStackLimitsData', {
  definition: AmplifyDataDefinition.fromString(/* GraphQL */ `
    type Query {
      ${functionFields}
    }
  `),
  authorizationModes: {
    defaultAuthorizationMode: 'AWS_IAM',
    iamConfig: { identityPoolId, authenticatedUserRole, unauthenticatedUserRole },
  },
});

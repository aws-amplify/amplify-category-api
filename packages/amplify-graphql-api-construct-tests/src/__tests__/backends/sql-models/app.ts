#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import { AccountPrincipal, Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

interface DBDetails {
  endpoint: string;
  port: number;
  dbName: string;
  vpcConfig: {
    vpcId: string;
    securityGroupIds: string[];
    subnetAvailabilityZones: [
      {
        subnetId: string;
        availabilityZone: string;
      },
    ];
  };
  ssmPaths: {
    hostnameSsmPath: string;
    portSsmPath: string;
    usernameSsmPath: string;
    passwordSsmPath: string;
    databaseNameSsmPath: string;
  };
}

// DO NOT CHANGE THIS VALUE: The test uses it to find resources by name
const STRATEGY_NAME = 'MySqlDBStrategy';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbDetails: DBDetails = require('../db-details.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const auth = new AmplifyAuth(stack, 'Auth');

const enableIamAuthorizationMode = process.env.ENABLE_IAM_AUTHORIZATION_MODE === 'true';
const api = new AmplifyGraphqlApi(stack, 'SqlBoundApi', {
  apiName: 'MySqlBoundApi',
  definition: AmplifyGraphqlDefinition.fromString(
    /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: public, provider: apiKey }]) @refersTo(name: "todos") {
        id: ID! @primaryKey
        description: String!
      }

      type TodoWithPrivateIam @model @auth(rules: [{ allow: private, provider: iam }]) @refersTo(name: "todosWithPrivateIam") {
        id: ID! @primaryKey
        description: String!
      }

      type TodoWithPublicIam @model @auth(rules: [{ allow: public, provider: iam }]) @refersTo(name: "todosWithPublicIam") {
        id: ID! @primaryKey
        description: String!
      }

      type TodoWithNoAuthDirective @model @refersTo(name: "todosWithNoAuthDirective") {
        id: ID! @primaryKey
        description: String!
      }
    `,
    {
      name: STRATEGY_NAME,
      dbType: 'MYSQL',
      vpcConfiguration: {
        vpcId: dbDetails.vpcConfig.vpcId,
        securityGroupIds: dbDetails.vpcConfig.securityGroupIds,
        subnetAvailabilityZoneConfig: dbDetails.vpcConfig.subnetAvailabilityZones,
      },
      dbConnectionConfig: {
        ...dbDetails.ssmPaths,
      },
      sqlLambdaProvisionedConcurrencyConfig: {
        provisionedConcurrentExecutions: 2,
      },
    },
  ),
  authorizationModes: {
    defaultAuthorizationMode: 'API_KEY',
    apiKeyConfig: { expires: Duration.days(7) },
    iamConfig: { enableIamAuthorizationMode },
    identityPoolConfig: {
      identityPoolId: auth.resources.cfnResources.cfnIdentityPool.ref,
      authenticatedUserRole: auth.resources.authenticatedUserIamRole,
      unauthenticatedUserRole: auth.resources.unauthenticatedUserIamRole,
    },
  },
  translationBehavior: {
    sandboxModeEnabled: true,
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

const {
  resources: { functions },
} = api;

const sqlLambda = functions[`SQLFunction${STRATEGY_NAME}`];
new CfnOutput(stack, 'SQLFunctionName', { value: sqlLambda.functionName });
new CfnOutput(stack, 'BasicRoleArn', { value: basicRole.roleArn });
new CfnOutput(stack, 'isIamAuthorizationModeEnabled', { value: enableIamAuthorizationMode.toString() });

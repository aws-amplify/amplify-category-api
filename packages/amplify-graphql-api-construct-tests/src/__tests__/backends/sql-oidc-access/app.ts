#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
// @ts-ignore
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlDefinition,
  SqlModelDataSourceDbConnectionConfig,
  ModelDataSourceStrategySqlDbType,
} from '@aws-amplify/graphql-api-construct';
import { AccountPrincipal, Effect, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { CfnUserPoolGroup, UserPool } from 'aws-cdk-lib/aws-cognito';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';

interface DBDetails {
  dbConfig: {
    endpoint: string;
    port: number;
    dbName: string;
    dbType: ModelDataSourceStrategySqlDbType;
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
  };
  dbConnectionConfig: SqlModelDataSourceDbConnectionConfig;
  schemaConfig: string;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbDetails: DBDetails = require('../db-details.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const preTokenLambda = new Function(stack, 'PreAuthLambda', {
  runtime: Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: Code.fromInline(`
    exports.handler = async event => {
        event.response = {
            claimsOverrideDetails: {
                claimsToAddOrOverride: {
                    user_id: event.userName,
                }
            }
        };
        return event;
    };
  `),
});
preTokenLambda.applyRemovalPolicy(RemovalPolicy.DESTROY);

const userPool = new UserPool(stack, 'UserPool', {
  signInAliases: {
    username: true, // Use username as the sign-in alias
    email: false, // Disable email as a sign-in alias
  },
  selfSignUpEnabled: true,
  autoVerify: { email: true },
  standardAttributes: {
    email: {
      required: true,
      mutable: false,
    },
  },
  lambdaTriggers: {
    preTokenGeneration: preTokenLambda,
  },
});
userPool.applyRemovalPolicy(RemovalPolicy.DESTROY);

['Admin', 'Dev'].forEach((group) => {
  new CfnUserPoolGroup(userPool, `CUPGroup${group}`, {
    userPoolId: userPool.userPoolId,
    groupName: group,
  });
});

const userPoolClient = userPool.addClient('UserPoolClient', {
  authFlows: {
    userPassword: true,
    userSrp: true,
  },
});

const api = new AmplifyGraphqlApi(stack, 'SqlBoundApi', {
  apiName: `${dbDetails.dbConfig.dbType}${Date.now()}`,
  definition: AmplifyGraphqlDefinition.fromString(dbDetails.schemaConfig, {
    name: `${dbDetails.dbConfig.dbType}DBStrategy`,
    dbType: dbDetails.dbConfig.dbType,
    vpcConfiguration: {
      vpcId: dbDetails.dbConfig.vpcConfig.vpcId,
      securityGroupIds: dbDetails.dbConfig.vpcConfig.securityGroupIds,
      subnetAvailabilityZoneConfig: dbDetails.dbConfig.vpcConfig.subnetAvailabilityZones,
    },
    dbConnectionConfig: {
      ...dbDetails.dbConnectionConfig,
    },
    sqlLambdaProvisionedConcurrencyConfig: {
      provisionedConcurrentExecutions: 2,
    },
  }),
  authorizationModes: {
    defaultAuthorizationMode: 'OPENID_CONNECT',
    oidcConfig: {
      oidcProviderName: 'awscognitouserpool',
      oidcIssuerUrl: `https://cognito-idp.${stack.region}.amazonaws.com/${userPool.userPoolId}`,
      clientId: userPoolClient.userPoolClientId,
      tokenExpiryFromAuth: Duration.hours(1),
      tokenExpiryFromIssue: Duration.hours(1),
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

new CfnOutput(stack, 'BasicRoleArn', { value: basicRole.roleArn });
new CfnOutput(stack, 'userPoolId', { value: userPool.userPoolId });
new CfnOutput(stack, 'webClientId', { value: userPoolClient.userPoolClientId });

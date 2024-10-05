#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
// @ts-ignore
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlDefinition,
  AuthorizationModes,
  SqlModelDataSourceDbConnectionConfig,
  ModelDataSourceStrategySqlDbType,
} from '@aws-amplify/graphql-api-construct';
import { AccountPrincipal, Effect, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { CfnUserPoolGroup, UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';

enum AUTH_MODE {
  API_KEY = 'API_KEY',
  AWS_IAM = 'AWS_IAM',
  AMAZON_COGNITO_USER_POOLS = 'AMAZON_COGNITO_USER_POOLS',
  OPENID_CONNECT = 'OPENID_CONNECT',
  AWS_LAMBDA = 'AWS_LAMBDA',
}

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
  apiAuthMode: AUTH_MODE;
}

// #region Utilities

const createUserPool = (prefix: string): { userPool: UserPool; userPoolClient: UserPoolClient } => {
  const userPool = new UserPool(stack, `${prefix}UserPool`, {
    signInAliases: {
      username: true,
      email: false,
    },
    selfSignUpEnabled: true,
    autoVerify: { email: true },
    standardAttributes: {
      email: {
        required: true,
        mutable: false,
      },
    },
  });
  userPool.applyRemovalPolicy(RemovalPolicy.DESTROY);

  ['Admin', 'Dev'].forEach((group) => {
    new CfnUserPoolGroup(userPool, `Group${group}`, {
      userPoolId: userPool.userPoolId,
      groupName: group,
    });
  });

  const userPoolClient = userPool.addClient(`${prefix}UserPoolClient`, {
    authFlows: {
      userPassword: true,
      userSrp: true,
    },
  });

  return { userPool, userPoolClient };
};

// #endregion Utilities

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbDetails: DBDetails = require('../db-details.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const { userPool, userPoolClient } = createUserPool(dbDetails.dbConfig.dbName);
let authorizationModes: AuthorizationModes;

switch (dbDetails.apiAuthMode) {
  case AUTH_MODE.AMAZON_COGNITO_USER_POOLS:
    authorizationModes = {
      defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
      userPoolConfig: {
        userPool,
      },
      apiKeyConfig: { expires: Duration.days(2) },
    };

    new CfnOutput(stack, 'userPoolId', { value: userPool.userPoolId });
    new CfnOutput(stack, 'webClientId', { value: userPoolClient.userPoolClientId });

    break;
  default:
    throw new Error(`Unsupported auth mode: ${dbDetails.apiAuthMode}`);
}

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
  authorizationModes,
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

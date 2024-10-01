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
import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct';
import { AccountPrincipal, Effect, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';

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

const authProps: AuthProps = {
  loginWith: {
    email: true,
  },
  groups: ['Admin', 'Dev'],
};

const auth = new AmplifyAuth(stack, 'Auth', authProps);

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
    defaultAuthorizationMode: 'API_KEY',
    apiKeyConfig: { expires: Duration.days(7) },
    userPoolConfig: {
      userPool: auth.resources.userPool,
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
new CfnOutput(stack, 'UserPoolId', { value: auth.resources.userPool.userPoolId });

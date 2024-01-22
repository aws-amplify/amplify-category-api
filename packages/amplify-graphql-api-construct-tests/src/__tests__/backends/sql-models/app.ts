#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration, CfnOutput } from 'aws-cdk-lib';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

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

const api = new AmplifyGraphqlApi(stack, 'SqlBoundApi', {
  apiName: 'MySqlBoundApi',
  definition: AmplifyGraphqlDefinition.fromString(
    /* GraphQL */ `
      type Todo @model @refersTo(name: "todos") {
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
    apiKeyConfig: { expires: Duration.days(7) },
  },
  translationBehavior: {
    sandboxModeEnabled: true,
  },
});
const {
  resources: { functions },
} = api;

const sqlLambda = functions[`SQLFunction${STRATEGY_NAME}`];
new CfnOutput(stack, 'SQLFunctionName', { value: sqlLambda.functionName });

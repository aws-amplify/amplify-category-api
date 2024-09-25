#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration, CfnOutput } from 'aws-cdk-lib';
// @ts-ignore
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlDefinition,
  SqlModelDataSourceDbConnectionConfig,
  ModelDataSourceStrategySqlDbType,
} from '@aws-amplify/graphql-api-construct';

interface DBDetails {
  dbConfig: {
    endpoint: string;
    port: number;
    dbName: string;
    strategyName: string;
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

const defaultSchemaConfig = /* GraphQL */ `
  type Todo @model @refersTo(name: "todos") {
    id: ID! @primaryKey
    description: String!
  }
`;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbDetails: DBDetails = require('../db-details.json');
const strategyName = dbDetails.dbConfig.strategyName;
const dbType = dbDetails.dbConfig.dbType;
const schemaConfig = dbDetails.schemaConfig ?? defaultSchemaConfig;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const api = new AmplifyGraphqlApi(stack, 'SqlBoundApi', {
  apiName: `${dbType}${Date.now()}`,
  definition: AmplifyGraphqlDefinition.fromString(schemaConfig, {
    name: strategyName,
    dbType,
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
    apiKeyConfig: { expires: Duration.days(7) },
  },
  translationBehavior: {
    sandboxModeEnabled: true,
  },
});
const {
  resources: { functions },
} = api;

const sqlLambda = functions[`SQLFunction${strategyName}`];
new CfnOutput(stack, 'SQLFunctionName', { value: sqlLambda.functionName });

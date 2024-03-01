#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration } from 'aws-cdk-lib';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import { BillingMode, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const api = new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  apiName: 'MyGraphQLApi',
  definition: AmplifyGraphqlDefinition.fromString(
    /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: public }]) {
        id: ID!
        description: String!
        name: String! @index(name: "byName2")
      }
    `,
    {
      dbType: 'DYNAMODB',
      provisionStrategy: 'AMPLIFY_TABLE',
    },
  ),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
  conflictResolution: {
    project: {
      detectionType: 'VERSION',
      handlerType: 'AUTOMERGE',
    },
  },
});

const todoTable = api.resources.cfnResources.amplifyDynamoDbTables['Todo'];
todoTable.billingMode = BillingMode.PROVISIONED;
todoTable.provisionedThroughput = {
  readCapacityUnits: 5,
  writeCapacityUnits: 5,
};
todoTable.setGlobalSecondaryIndexProvisionedThroughput('byName2', {
  readCapacityUnits: 4,
  writeCapacityUnits: 4,
});
todoTable.pointInTimeRecoveryEnabled = true;
todoTable.sseSpecification = { sseEnabled: false };
todoTable.streamSpecification = { streamViewType: StreamViewType.KEYS_ONLY };

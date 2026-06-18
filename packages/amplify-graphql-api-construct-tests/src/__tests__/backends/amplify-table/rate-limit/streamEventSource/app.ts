#!/usr/bin/env node
import { App, Duration, Stack, Tags } from 'aws-cdk-lib';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import { StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});
const schema =
  `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n` +
  Array.from({ length: 40 }, (_, i) => i + 1)
    .map(
      (number) =>
        `type Parent${number} @model {
    id: ID!
    name: String
    children: [Child${number}] @hasMany(indexName: "byParent${number}", fields: ["id"])
  }

  type Child${number} @model {
    id: ID!
    name: String
    parentID: ID! @index(name: "byParent${number}")
    parent: Parent${number} @belongsTo(fields: ["parentID"])
  }
  `,
    )
    .join('\n');

const api = new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  apiName: 'MyGraphQLApi',
  definition: AmplifyGraphqlDefinition.fromString(schema, {
    dbType: 'DYNAMODB',
    provisionStrategy: 'AMPLIFY_TABLE',
  }),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
});

const streamTable = api.resources.cfnResources.amplifyDynamoDbTables.Parent1 as unknown as {
  streamSpecification: { streamViewType: StreamViewType };
  tableName: string;
  tableStreamArn: string;
};
streamTable.streamSpecification = { streamViewType: StreamViewType.NEW_IMAGE };

const streamSourceTable = Table.fromTableAttributes(stack, 'Parent1StreamSourceTable', {
  tableName: streamTable.tableName,
  tableStreamArn: streamTable.tableStreamArn,
});

const streamHandler = new Function(stack, 'Parent1StreamHandler', {
  code: Code.fromInline('exports.handler = async () => {};'),
  handler: 'index.handler',
  runtime: Runtime.NODEJS_18_X,
});

streamHandler.addEventSource(
  new DynamoEventSource(streamSourceTable, {
    batchSize: 1,
    startingPosition: StartingPosition.LATEST,
  }),
);
streamHandler.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:ListStreams'],
    resources: [streamTable.tableStreamArn],
  }),
);

Tags.of(stack).add('created-by', 'amplify-original');

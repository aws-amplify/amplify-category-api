#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration } from 'aws-cdk-lib';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const importedAmplifyDynamoDBTableMap: Record<string, string> = require('../table-map.json');

new AmplifyGraphqlApi(stack, 'Data', {
  apiName: 'MyGraphQLApi',
  definition: AmplifyGraphqlDefinition.fromString(
    /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: public }]) {
        id: ID!
        content: String
      }
    `,
    {
      dbType: 'DYNAMODB' as const,
      provisionStrategy: 'IMPORTED_AMPLIFY_TABLE' as const,
      tableName: importedAmplifyDynamoDBTableMap.Todo,
    },
  ),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
});
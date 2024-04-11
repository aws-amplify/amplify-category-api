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
const schema =
  `input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }\n` +
  Array.from({ length: 60 }, (_, i) => i + 1)
    .map(
      (number) =>
        `type Todo${number} @model {
    id: ID!
  }
  `,
    )
    .join('\n');
new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  apiName: 'MyGraphQLApi',
  definition: AmplifyGraphqlDefinition.fromString(schema, {
    dbType: 'DYNAMODB',
    provisionStrategy: 'AMPLIFY_TABLE',
  }),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
});

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

new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  apiName: 'GSIProjectionKeysOnly',
  definition: AmplifyGraphqlDefinition.fromString(
    /* GraphQL */ `
      type Product @model @auth(rules: [{ allow: public }]) {
        id: ID!
        name: String!
        category: String! @index(name: "byCategory", queryField: "productsByCategory", projection: { type: KEYS_ONLY })
        price: Float
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
});

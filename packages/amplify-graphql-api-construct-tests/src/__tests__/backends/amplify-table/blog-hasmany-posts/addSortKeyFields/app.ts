#!/usr/bin/env node
import { App, Duration, Stack } from 'aws-cdk-lib';
import 'source-map-support/register';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  apiName: 'MyGraphQLApi',
  definition: AmplifyGraphqlDefinition.fromString(
    /* GraphQL */ `
      input AMPLIFY {
        globalAuthRule: AuthRule = { allow: public }
      }
      type Blog @model {
        id: ID!
        name: String!
        posts: [Post] @hasMany
      }
      type Post @model {
        id: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        blog: Blog @belongsTo
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
  translationBehavior: {
    allowDestructiveGraphqlSchemaUpdates: true,
  },
});

#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration, CfnOutput } from 'aws-cdk-lib';
import { GraphqlApi, Definition, MergeType } from 'aws-cdk-lib/aws-appsync';
// @ts-ignore
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const sourceApi = new AmplifyGraphqlApi(stack, 'SourceApi', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      description: String!
    }
  `),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
});

const mergedApi = new GraphqlApi(stack, 'MergedApi', {
  name: 'MergedApi',
  definition: Definition.fromSourceApis({
    sourceApis: [{ sourceApi, mergeType: MergeType.AUTO_MERGE }],
  }),
});

// Explicit outputs for merged api querying
new CfnOutput(stack, 'mergedApiEndpoint', {
  value: mergedApi.graphqlUrl,
});

new CfnOutput(stack, 'mergedApiKey', {
  value: sourceApi.apiKey,
});

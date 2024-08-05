#!/usr/bin/env node
import { App, Duration, Stack } from 'aws-cdk-lib';
import 'source-map-support/register';
// @ts-ignore
import { AmplifyData, AmplifyDataDefinition } from '@aws-amplify/data-construct';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

new AmplifyData(stack, 'Data', {
  apiName: 'MyGraphQLApi',
  definition: AmplifyDataDefinition.fromString(/* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      description: String!
    }
  `),
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
});

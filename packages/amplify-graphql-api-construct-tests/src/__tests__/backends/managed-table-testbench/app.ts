#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
// @ts-ignore
import * as graphql from '@aws-amplify/graphql-api-construct';
import * as path from 'path';

const packageJson = require('../package.json');

const app = new cdk.App();
const stack = new cdk.Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const amplifyTableStrategy: graphql.ModelDataSourceDefinition = {
  name: 'customDDB',
  strategy: {
    dbType: 'DYNAMODB',
    provisionStrategy: 'AMPLIFY_TABLE',
  },
};
const api = new graphql.AmplifyGraphqlApi(stack, 'Harness', {
  definition: graphql.AmplifyGraphqlDefinition.fromFilesAndDefinition(path.join(__dirname, 'schema.graphql'), amplifyTableStrategy),
  authorizationModes: { apiKeyConfig: { expires: cdk.Duration.days(7) } },
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
try {
  require('./apiPostProcessor')(api);
} catch (_) {
  /* No-op */
}

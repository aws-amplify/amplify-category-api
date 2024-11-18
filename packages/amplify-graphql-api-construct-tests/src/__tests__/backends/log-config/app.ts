#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlDefinition,
  FieldLogLevel,
  RetentionDays,
  Logging,
  LogConfig,
} from '@aws-amplify/graphql-api-construct';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new cdk.App();
const stack = new cdk.Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

// Parsing the logging context
const loggingContext = stack.node.tryGetContext('logging');
let logging: Logging | undefined;

if (loggingContext === 'true' || loggingContext === '{}') {
  logging = true;
} else if (loggingContext !== undefined) {
  let logConfig: LogConfig = {};
  const parsedLoggingContext = JSON.parse(loggingContext) as LogConfig;

  if ('retention' in parsedLoggingContext) {
    const enumValue = parsedLoggingContext.retention as RetentionDays;
    logConfig = { ...logConfig, retention: enumValue };
  }
  if ('excludeVerboseContent' in parsedLoggingContext) {
    logConfig = { ...logConfig, excludeVerboseContent: parsedLoggingContext.excludeVerboseContent };
  }
  if ('fieldLogLevel' in parsedLoggingContext) {
    const enumValue = parsedLoggingContext.fieldLogLevel as FieldLogLevel;
    logConfig = { ...logConfig, fieldLogLevel: enumValue };
  }

  logging = logConfig;
}

new AmplifyGraphqlApi(stack, 'GraphqlApi', {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      id: ID!
      name: String!
      description: String
      complete: Boolean
    }
  `),
  authorizationModes: { apiKeyConfig: { expires: cdk.Duration.days(7) } },
  logging,
});

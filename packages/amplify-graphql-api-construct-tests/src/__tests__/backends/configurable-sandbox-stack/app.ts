#!/usr/bin/env node
import 'source-map-support/register';
import * as fs from 'fs';
import * as path from 'path';
import { App, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlDefinition,
  IAmplifyGraphqlDefinition,
  ModelDataSourceStrategy,
} from '@aws-amplify/graphql-api-construct';

// This app defines a CDK stack that is configured with various command files written into the project root directory. To use it:
// - Write test definition(s) to `projRoot/*-test-definition.json`
// - Write the stack prefix to `projRoot/stack-prefix.txt`

interface TestDefinition {
  schema: string;
  strategy: ModelDataSourceStrategy;
}

const definitionFromTestDefinition = (testDefinition: TestDefinition): IAmplifyGraphqlDefinition => {
  const { schema, strategy } = testDefinition;
  return AmplifyGraphqlDefinition.fromString(schema, strategy);
};

const combineTestDefinitionsInDirectory = (directory: string): IAmplifyGraphqlDefinition => {
  const definitions = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.test-definition.json'))
    .map((file) => path.join(directory, file))
    .map((fullPath) => fs.readFileSync(fullPath).toString())
    .map((fileContents) => JSON.parse(fileContents) as TestDefinition)
    .map(definitionFromTestDefinition);

  return AmplifyGraphqlDefinition.combine(definitions);
};

const projRoot = path.normalize(path.join(__dirname, '..'));

// Read the prefix to use when naming stack assets. Keep this short so you don't bump up against resource length limits (e.g., 140
// characters for lambda layers).
// arn:aws:lambda:ap-northeast-2:012345678901:layer:${PREFIX}ApiAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerABCDEF12:1
const PREFIX = fs.readFileSync(path.join(projRoot, 'stack-prefix.txt'));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

// Stack setup

const app = new App();
const stackName = packageJson.name.replace(/_/g, '-');
const stack = new Stack(app, stackName, {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const combinedDefinition = combineTestDefinitionsInDirectory(projRoot);

new AmplifyGraphqlApi(stack, `${PREFIX}Api`, {
  definition: combinedDefinition,
  authorizationModes: {
    apiKeyConfig: { expires: Duration.days(7) },
  },
  translationBehavior: {
    sandboxModeEnabled: true,
  },
});

#!/usr/bin/env node
import 'source-map-support/register';
import * as fs from 'fs';
import * as path from 'path';
import { App, CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlDefinition,
  IAmplifyGraphqlDefinition,
  ModelDataSourceStrategy,
} from '@aws-amplify/graphql-api-construct';

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

// Keeping this short so we don't bump up against resource length limits (e.g., 140 characters for lambda layers).
// arn:aws:lambda:ap-northeast-2:012345678901:layer:${PREFIX}ApiAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerABCDEF12:1
const PREFIX = 'RFAuthTest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

// Stack setup

const app = new App();
const stackName = packageJson.name.replace(/_/g, '-');
const stack = new Stack(app, stackName, {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const userPool = new UserPool(stack, `${PREFIX}UserPool`, {
  deletionProtection: false,
});
userPool.applyRemovalPolicy(RemovalPolicy.DESTROY);

// Allow username/password without SRP, so our tests can easily login without having to set up an Amplify project and client library. Also
// enable SRP, so we can troubleshoot in the console if need be.
const userPoolClient = userPool.addClient(`${PREFIX}UserPoolClient`, {
  authFlows: {
    userPassword: true,
    userSrp: true,
  },
});

const testDefinitionDir = path.normalize(path.join(__dirname, '..'));
const combinedDefinition = combineTestDefinitionsInDirectory(testDefinitionDir);

new AmplifyGraphqlApi(stack, `${PREFIX}Api`, {
  definition: combinedDefinition,
  authorizationModes: {
    defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
    userPoolConfig: { userPool },
    apiKeyConfig: { expires: Duration.days(360) },
  },
});

new CfnOutput(stack, 'UserPoolId', { value: userPool.userPoolId });
new CfnOutput(stack, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });

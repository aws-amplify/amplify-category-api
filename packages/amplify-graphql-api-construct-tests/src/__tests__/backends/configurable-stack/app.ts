#!/usr/bin/env node
import 'source-map-support/register';
import * as fs from 'fs';
import * as path from 'path';
import { App, Aspects, CfnOutput, Duration, IAspect, RemovalPolicy, Stack, TagManager, Tags } from 'aws-cdk-lib';
import { CfnUserPoolGroup, UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { CfnFunction, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlDefinition,
  AuthorizationModes,
  IAmplifyGraphqlDefinition,
  ModelDataSourceStrategy,
} from '@aws-amplify/graphql-api-construct';
import { IConstruct } from 'constructs';
import { applyOverrides } from './overrides';

// This app defines a CDK stack that is configured with various command files written into the project root directory. To use it:
// - Write test definition(s) to `projRoot/*-test-definition.json`
// - Write the stack prefix to `projRoot/stack-prefix.txt`

interface TestDefinition {
  schema: string;
  strategy: ModelDataSourceStrategy;
}

// #region Utilities

/**
 * Controls stack-level configurations. TODO: Move TestDefinitions into this structure so we can stop writing so many files.
 */
interface StackConfig {
  /**
   * The prefix to use when naming stack assets. Keep this short (<=15 characters) so you don't bump up against resource length limits
   * (e.g., 140 characters for lambda layers). Prefixes longer than 15 characters will be truncated.
   * arn:aws:lambda:ap-northeast-2:012345678901:layer:${PREFIX}ApiAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerABCDEF12:1
   */
  prefix: string;

  /**
   * If true, disable Cognito User Pool creation and only use API Key auth in sandbox mode.
   */
  useSandbox?: boolean;

  /**
   * If provided, use the provided Lambda Layer ARN instead of the default retrieved from the Lambda Layer version resolver. Suitable for
   * overriding the default layers during tests.
   */
  sqlLambdaLayerArn?: string;
}

const createUserPool = (prefix: string): { userPool: UserPool; userPoolClient: UserPoolClient } => {
  const userPool = new UserPool(stack, `${prefix}UserPool`, {
    deletionProtection: false,
  });
  userPool.applyRemovalPolicy(RemovalPolicy.DESTROY);

  // Create 3 user pool groups for group based auth tests
  [1, 2, 3].forEach((idx) => {
    new CfnUserPoolGroup(userPool, `${prefix}CUPGroup${idx}`, {
      userPoolId: userPool.userPoolId,
      groupName: `Group${idx}`,
      precedence: idx * 10,
    });
  });

  // Allow username/password without SRP, so our tests can easily login without having to set up an Amplify project and client library. Also
  // enable SRP, so we can troubleshoot in the console if need be.
  const userPoolClient = userPool.addClient(`${prefix}UserPoolClient`, {
    authFlows: {
      userPassword: true,
      userSrp: true,
    },
  });
  return { userPool, userPoolClient };
};

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

const readStackConfig = (projRoot: string): StackConfig => {
  const configPath = path.join(projRoot, 'stack-config.json');
  const configString = fs.readFileSync(configPath).toString();
  const config = JSON.parse(configString);
  config.prefix = config.prefix.substring(0, 15);
  return config;
};

// #endregion Utilities

const projRoot = path.normalize(path.join(__dirname, '..'));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const stackConfig = readStackConfig(projRoot);

const app = new App();
const stackName = packageJson.name.replace(/_/g, '-');
const stack = new Stack(app, stackName, {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

let authorizationModes: AuthorizationModes;

if (stackConfig.useSandbox) {
  authorizationModes = {
    apiKeyConfig: { expires: Duration.days(2) },
  };
} else {
  const { userPool, userPoolClient } = createUserPool(stackConfig.prefix);
  authorizationModes = {
    defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
    userPoolConfig: { userPool },
    apiKeyConfig: { expires: Duration.days(2) },
  };
  new CfnOutput(stack, 'UserPoolId', { value: userPool.userPoolId });
  new CfnOutput(stack, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
}

const combinedDefinition = combineTestDefinitionsInDirectory(projRoot);

const api = new AmplifyGraphqlApi(stack, `${stackConfig.prefix}Api`, {
  definition: combinedDefinition,
  authorizationModes,
  translationBehavior: {
    sandboxModeEnabled: stackConfig.useSandbox,
  },
});

const isFunction = (obj: any): obj is CfnFunction => {
  return obj && obj instanceof CfnFunction;
};

class LambdaLayerVersionOverride implements IAspect {
  constructor(private sqlLambdaLayerArn: string) {}

  public visit(node: IConstruct): void {
    if (!isFunction(node)) {
      return;
    }
    node.layers = [this.sqlLambdaLayerArn];
  }
}

if (stackConfig.sqlLambdaLayerArn) {
  // Ideally, we'd pick up something a bit more definitive than string matching on the function name, but the function's environment
  // variables and tags aren't inspectable at prepare time, so Aspects can't operate on them.
  const sqlFunctionKey = Object.keys(api.resources.functions).find((key) => key.startsWith('SQLFunction'));
  if (sqlFunctionKey) {
    const fn = api.resources.functions[sqlFunctionKey];
    Aspects.of(fn).add(new LambdaLayerVersionOverride(stackConfig.sqlLambdaLayerArn));
  }
}

applyOverrides(api);

#!/usr/bin/env node
/* eslint-disable max-classes-per-file */
import 'source-map-support/register';
import * as fs from 'fs';
import * as path from 'path';
import { App, CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { AccountPrincipal, Effect, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition, AuthorizationModes } from '@aws-amplify/graphql-api-construct';
import { BaseDataSource, Code, FunctionRuntime, NoneDataSource } from 'aws-cdk-lib/aws-appsync';

// #region Utilities

/**
 * Controls stack-level configurations. TODO: Move TestDefinitions into this structure so we can stop writing so many files.
 */
interface StackConfig {
  /**
   * Test-defined authorization mode settings. These will be applied to the final stack authorization configuration. If a field is present
   * in this structure, it will override the default supplied by the configurable stack.
   */
  partialAuthorizationModes?: Partial<AuthorizationModes>;

  /**
   * The prefix to use when naming stack assets. Keep this short (<=15 characters) so you don't bump up against resource length limits
   * (e.g., 140 characters for lambda layers). Prefixes longer than 15 characters will be truncated.
   * arn:aws:lambda:ap-northeast-2:012345678901:layer:${PREFIX}ApiAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerABCDEF12:1
   */
  prefix: string;

  /**
   * If provided, use the provided Lambda Layer ARN instead of the default retrieved from the Lambda Layer version resolver. Suitable for
   * overriding the default layers during tests.
   */
  sqlLambdaLayerArn?: string;

  testRoleProps: TestRoleProps;

  /**
   * If true, disable Cognito User Pool creation and only use API Key auth in sandbox mode.
   */
  useSandbox?: boolean;
}

/**
 * Specifies values for creating an IAM role to be used in tests.
 */
interface TestRoleProps {
  /**
   * The AWS account that will be allowed to assume the role
   */
  assumedByAccount: string;
}

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

const authorizationModes: AuthorizationModes = {
  defaultAuthorizationMode: 'API_KEY',
  apiKeyConfig: { expires: Duration.days(2) },
  ...stackConfig.partialAuthorizationModes,
};

interface AddTestResolverInput {
  api: AmplifyGraphqlApi;
  fieldName: string;
  noneDataSource: NoneDataSource;
  prefix: string;
  typeName: string;
}

const addTestResolver = (input: AddTestResolverInput): void => {
  const { api, noneDataSource, prefix, typeName, fieldName } = input;

  const returnValue = `"test-value-${typeName}-${fieldName}"`;
  const scalarReturnClause = `return ${returnValue}`;
  const customTypeReturnClause = `return { value: ${returnValue} }`;
  const returnClause = fieldName.match('Scalar') ? scalarReturnClause : customTypeReturnClause;

  api.addResolver(`${prefix}${typeName === 'Query' ? 'Get' : 'Update'}${typeName}${fieldName}Resolver`, {
    typeName,
    fieldName,
    runtime: FunctionRuntime.JS_1_0_0,
    dataSource: noneDataSource,
    code: Code.fromInline(`
      export function request(ctx) {
        return {};
      }
  
      export function response(ctx) {
        ${returnClause};
      }
    `),
  });
};

const api = new AmplifyGraphqlApi(stack, `${stackConfig.prefix}Api`, {
  definition: AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
    # Query is required to pass AppSync's validation. Without it, we get an error: "There is no top level schema object defined".
    # We could also include a @model, which would cause the model transformer to create model-related Query fields, but it's
    # important that we test the behavior in a schema with no @models. For this test, we'll include custom query fields, but it's
    # important to note the behavior since it's possible for customers to create schemas with no models and no Query fields.
    type Query {
      getScalar: String
      getCustomType: CustomType
    }

    type Mutation {
      updateScalar: String
      updateCustomType: CustomType
    }

    type CustomType {
      value: String
    }
  `),
  authorizationModes,
  translationBehavior: {
    sandboxModeEnabled: stackConfig.useSandbox,
  },
});

const dataSourceName = `${stackConfig.prefix}NoneDS`;
const noneDataSource = api.addNoneDataSource(dataSourceName, { name: dataSourceName });

addTestResolver({
  api,
  noneDataSource,
  prefix: stackConfig.prefix,
  typeName: 'Query',
  fieldName: 'getScalar',
});

addTestResolver({
  api,
  noneDataSource,
  prefix: stackConfig.prefix,
  typeName: 'Query',
  fieldName: 'getCustomType',
});

addTestResolver({
  api,
  noneDataSource,
  prefix: stackConfig.prefix,
  typeName: 'Mutation',
  fieldName: 'updateScalar',
});

addTestResolver({
  api,
  noneDataSource,
  prefix: stackConfig.prefix,
  typeName: 'Mutation',
  fieldName: 'updateCustomType',
});

class TestRole extends Role {
  constructor(scope: Construct, id: string, props: TestRoleProps & { api: AmplifyGraphqlApi }) {
    const { assumedByAccount, api: graphqlApi } = props;
    const apiArn = graphqlApi.resources.graphqlApi.arn;

    const policyStatement = new PolicyStatement({
      sid: 'EnableGraphqlForRole',
      actions: ['appsync:GraphQL'],
      effect: Effect.ALLOW,
      resources: [
        `${apiArn}/types/CustomType`,
        `${apiArn}/types/CustomType/fields/value`,
        `${apiArn}/types/Mutation/fields/updateScalar`,
        `${apiArn}/types/Mutation/fields/updateCustomType`,
        `${apiArn}/types/Query/fields/getScalar`,
        `${apiArn}/types/Query/fields/getCustomType`,
      ],
    });
    super(scope, id, {
      assumedBy: new AccountPrincipal(assumedByAccount),
      inlinePolicies: {
        allowGraphqlQuery: new PolicyDocument({
          statements: [policyStatement],
        }),
      },
    });
  }
}

const testRole = new TestRole(stack, `${stackConfig.prefix}TestRole`, {
  api,
  assumedByAccount: stackConfig.testRoleProps.assumedByAccount,
});
new CfnOutput(stack, 'awsIamTestRoleArn', { value: testRole.roleArn });

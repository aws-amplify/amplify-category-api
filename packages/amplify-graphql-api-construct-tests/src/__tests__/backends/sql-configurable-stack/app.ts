#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
// @ts-ignore
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlDefinition,
  AuthorizationModes,
  IAmplifyGraphqlDefinition,
  SqlModelDataSourceDbConnectionConfig,
  ModelDataSourceStrategySqlDbType,
  PartialTranslationBehavior,
} from '@aws-amplify/graphql-api-construct';
import { AccountPrincipal, Effect, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { CfnUserPoolGroup, UserPool, UserPoolClient, UserPoolTriggers } from 'aws-cdk-lib/aws-cognito';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';

// #region Utilities

enum AUTH_MODE {
  API_KEY = 'API_KEY',
  AWS_IAM = 'AWS_IAM',
  AMAZON_COGNITO_USER_POOLS = 'AMAZON_COGNITO_USER_POOLS',
  OPENID_CONNECT = 'OPENID_CONNECT',
  AWS_LAMBDA = 'AWS_LAMBDA',
}

interface DBDetails {
  dbConfig: {
    endpoint: string;
    port: number;
    dbName: string;
    dbType: ModelDataSourceStrategySqlDbType;
    strategyName: string;
    vpcConfig: {
      vpcId: string;
      securityGroupIds: string[];
      subnetAvailabilityZones: [
        {
          subnetId: string;
          availabilityZone: string;
        },
      ];
    };
  };
  dbConnectionConfig: SqlModelDataSourceDbConnectionConfig;
}

interface StackConfig {
  /**
   * The AppSync GraphQL schema, provided as string for AmplifyGraphqlApi Construct definition.
   */
  schema: string;

  /**
   * The AuthorizationMode type for AmplifyGraphqlApi Construct.
   */
  authMode?: AUTH_MODE;

  /**
   * If true, disable Cognito User Pool/Auth resources creation and only use API Key auth in sandbox mode.
   */
  useSandbox?: boolean;

  /**
   * Cognito User Pool groups to create when provisioning the User Pool.
   *
   * **NOTE**
   * Provide at least two group names for setup and testing purposes.
   */
  userGroups?: string[];

  /**
   * The OIDC options/config when using OIDC AuthorizationMode for AmplifyGraphqlApi Construct.
   *
   * @property {Record<string, string>} [triggers] - UserPoolTriggers for Cognito User Pool when provisioning the User Pool as OIDC provider.
   * - key: trigger name e.g. 'preTokenGeneration'
   * - value: the lambda function code inlined as a string
   *
   * **NOTE**
   * - Only applicable when AuthorizationMode is set to OIDC.
   * - Currently only supports Cognito User Pools as the simulated OIDC provider for E2E test.
   * - Currently only supports JavaScript as the lambda function code, with Node.js runtime version 18.x.
   * - Inline code needs to export the handler function as `handler` as `index.handler` would be used as the handler path.
   */
  oidcOptions?: {
    triggers: Record<string, string>;
  };
}

const createApiDefinition = (): IAmplifyGraphqlDefinition => {
  return AmplifyGraphqlDefinition.fromString(stackConfig.schema, {
    name: dbDetails.dbConfig.strategyName,
    dbType: dbDetails.dbConfig.dbType,
    vpcConfiguration: {
      vpcId: dbDetails.dbConfig.vpcConfig.vpcId,
      securityGroupIds: dbDetails.dbConfig.vpcConfig.securityGroupIds,
      subnetAvailabilityZoneConfig: dbDetails.dbConfig.vpcConfig.subnetAvailabilityZones,
    },
    dbConnectionConfig: {
      ...dbDetails.dbConnectionConfig,
    },
    sqlLambdaProvisionedConcurrencyConfig: {
      provisionedConcurrentExecutions: 2,
    },
  });
};

const createAuthorizationModes = (): AuthorizationModes => {
  const auth = stackConfig.authMode ?? AUTH_MODE.API_KEY;
  let authorizationModes: AuthorizationModes;

  switch (auth) {
    case AUTH_MODE.API_KEY: {
      authorizationModes = {
        defaultAuthorizationMode: 'API_KEY',
        apiKeyConfig: { expires: Duration.days(7) },
      };

      break;
    }
    case AUTH_MODE.AMAZON_COGNITO_USER_POOLS: {
      const { userPool, userPoolClient } = createUserPool(dbDetails.dbConfig.dbName);

      authorizationModes = {
        defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
        userPoolConfig: {
          userPool,
        },
        apiKeyConfig: { expires: Duration.days(2) },
      };

      break;
    }
    case AUTH_MODE.OPENID_CONNECT: {
      const { userPool, userPoolClient } = createUserPool(dbDetails.dbConfig.dbName, stackConfig.oidcOptions?.triggers);

      authorizationModes = {
        defaultAuthorizationMode: 'OPENID_CONNECT',
        oidcConfig: {
          oidcProviderName: 'awscognitouserpool',
          oidcIssuerUrl: `https://cognito-idp.${stack.region}.amazonaws.com/${userPool.userPoolId}`,
          clientId: userPoolClient.userPoolClientId,
          tokenExpiryFromAuth: Duration.hours(1),
          tokenExpiryFromIssue: Duration.hours(1),
        },
      };

      break;
    }
    default: {
      throw new Error(`Unsupported auth mode: ${stackConfig.authMode}`);
    }
  }

  return authorizationModes;
};

const createTranslationBehavior = (): PartialTranslationBehavior => {
  const translationBehavior: PartialTranslationBehavior = {
    sandboxModeEnabled: stackConfig.useSandbox ?? false,
  };
  return translationBehavior;
};

const createUserPool = (prefix: string, triggers?: Record<string, string>): { userPool: UserPool; userPoolClient: UserPoolClient } => {
  const userPool = new UserPool(stack, `${prefix}UserPool`, {
    signInAliases: {
      username: true,
      email: false,
    },
    selfSignUpEnabled: true,
    autoVerify: { email: true },
    standardAttributes: {
      email: {
        required: true,
        mutable: false,
      },
    },
    lambdaTriggers: triggers ? createUserPoolTriggers(triggers) : {},
  });
  userPool.applyRemovalPolicy(RemovalPolicy.DESTROY);

  stackConfig.userGroups?.forEach((group) => {
    new CfnUserPoolGroup(userPool, `Group${group}`, {
      userPoolId: userPool.userPoolId,
      groupName: group,
    });
  });

  const userPoolClient = userPool.addClient(`${prefix}UserPoolClient`, {
    authFlows: {
      userPassword: true,
      userSrp: true,
    },
  });

  new CfnOutput(stack, 'userPoolId', { value: userPool.userPoolId });
  new CfnOutput(stack, 'webClientId', { value: userPoolClient.userPoolClientId });

  return { userPool, userPoolClient };
};

const createUserPoolTriggers = (triggers: Record<string, string>): UserPoolTriggers => {
  const userPoolTriggers: UserPoolTriggers = {};

  Object.keys(triggers).forEach((triggerName) => {
    userPoolTriggers[triggerName] = createLambdaFunction(triggerName, triggers[triggerName]);
  });

  return userPoolTriggers;
};

const createLambdaFunction = (name: string, code: string): Function => {
  return new Function(stack, `${name}Lambda`, {
    runtime: Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: Code.fromInline(code),
  });
};

const createBasicRole = () => {
  const basicRole = new Role(stack, 'BasicRole', {
    assumedBy: new AccountPrincipal(stack.account),
    path: '/',
    inlinePolicies: {
      root: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: ['arn:aws:logs:*:*:*'],
            effect: Effect.ALLOW,
          }),
        ],
      }),
    },
  });
  basicRole.applyRemovalPolicy(RemovalPolicy.DESTROY);

  basicRole.addToPolicy(
    new PolicyStatement({
      actions: ['appsync:GraphQL'],
      resources: [`${api.resources.graphqlApi.arn}/*`],
      effect: Effect.ALLOW,
    }),
  );

  new CfnOutput(stack, 'BasicRoleArn', { value: basicRole.roleArn });
};

const createAdditionalCfnOutputs = () => {
  switch (stackConfig.authMode) {
    case AUTH_MODE.API_KEY: {
      const {
        resources: { functions },
      } = api;
      const sqlLambda = functions[`SQLFunction${dbDetails.dbConfig.strategyName}`];

      new CfnOutput(stack, 'SQLFunctionName', { value: sqlLambda.functionName });
    }
    default: {
      new CfnOutput(stack, 'GraphQLApiId', { value: api.resources.graphqlApi.apiId });
      new CfnOutput(stack, 'GraphQLApiArn', { value: api.resources.graphqlApi.arn });
      new CfnOutput(stack, 'region', { value: stack.region });
    }
  }
};

// #endregion Utilities

// #region CDK App

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbDetails: DBDetails = require('../db-details.json');
const stackConfig: StackConfig = require('../stack-config.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const definition = createApiDefinition();
const authorizationModes = createAuthorizationModes();
const translationBehavior = createTranslationBehavior();

const api = new AmplifyGraphqlApi(stack, `SqlBoundApi`, {
  apiName: `${dbDetails.dbConfig.dbType}${Date.now()}`,
  definition,
  authorizationModes,
  translationBehavior,
});

createBasicRole();
createAdditionalCfnOutputs();

// #endregion CDK App

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
    name: `${dbDetails.dbConfig.dbType}DBStrategy`,
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
  let authorizationModes: AuthorizationModes;

  switch (stackConfig.authMode) {
    case AUTH_MODE.AMAZON_COGNITO_USER_POOLS: {
      const { userPool, userPoolClient } = createUserPool(dbDetails.dbConfig.dbName);

      authorizationModes = {
        defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
        userPoolConfig: {
          userPool,
        },
        apiKeyConfig: { expires: Duration.days(2) },
      };

      new CfnOutput(stack, 'userPoolId', { value: userPool.userPoolId });
      new CfnOutput(stack, 'webClientId', { value: userPoolClient.userPoolClientId });

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

      new CfnOutput(stack, 'userPoolId', { value: userPool.userPoolId });
      new CfnOutput(stack, 'webClientId', { value: userPoolClient.userPoolClientId });

      break;
    }
    default: {
      throw new Error(`Unsupported auth mode: ${stackConfig.authMode}`);
    }
  }

  return authorizationModes;
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
    lambdaTriggers: triggers ? createTriggers(triggers) : {},
  });
  userPool.applyRemovalPolicy(RemovalPolicy.DESTROY);

  ['Admin', 'Dev'].forEach((group) => {
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

  return { userPool, userPoolClient };
};

const createTriggers = (triggers: Record<string, string>): UserPoolTriggers => {
  const userPoolTriggers: UserPoolTriggers = {};

  Object.keys(triggers).forEach((triggerName) => {
    userPoolTriggers[triggerName] = createLambdaFunction(triggerName, triggers[triggerName]);
  });

  return userPoolTriggers;
};

const createLambdaFunction = (triggernName: string, code: string): Function => {
  return new Function(stack, `${triggernName}Lambda`, {
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

const api = new AmplifyGraphqlApi(stack, `${dbDetails.dbConfig.dbType}SqlBoundApi`, {
  definition,
  authorizationModes,
});

createBasicRole();

// #endregion CDK App

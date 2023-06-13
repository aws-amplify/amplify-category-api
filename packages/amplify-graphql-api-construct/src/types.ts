import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export type IAMAuthorizationConfig = {
  identityPoolId?: string;
  authRole?: iam.IRole;
  unauthRole?: iam.IRole;
  adminRoles?: iam.IRole[];
};

export type IAMAuthorizationConfigWithMode = IAMAuthorizationConfig & {
  type: 'AWS_IAM';
};

export type UserPoolAuthorizationConfig = {
  userPool: cognito.IUserPool;
};

export type UserPoolAuthorizationConfigWithMode = UserPoolAuthorizationConfig & {
  type: 'AMAZON_COGNITO_USER_POOLS';
};

export type OIDCAuthorizationConfig = {
  oidcProviderName: string;
  oidcIssuerUrl: string;
  clientId?: string;
  tokenExpiryFromAuth: cdk.Duration;
  tokenExpiryFromIssue: cdk.Duration;
};

export type OIDCAuthorizationConfigWithMode = OIDCAuthorizationConfig & {
  type: 'OPENID_CONNECT';
};

export type ApiKeyAuthorizationConfig = {
  description?: string;
  expires: cdk.Duration;
};

export type ApiKeyAuthorizationConfigWithMode = ApiKeyAuthorizationConfig & {
  type: 'API_KEY';
};

export type LambdaAuthorizationConfig = {
  function: lambda.IFunction;
  ttl: cdk.Duration;
};

export type LambdaAuthorizationConfigWithMode = LambdaAuthorizationConfig & {
  type: 'AWS_LAMBDA';
};

export type AuthorizationMode =
  | 'AWS_IAM'
  | 'AMAZON_COGNITO_USER_POOLS'
  | 'OPENID_CONNECT'
  | 'API_KEY'
  | 'AWS_LAMBDA';

export type AuthorizationConfigMode =
  | IAMAuthorizationConfigWithMode
  | UserPoolAuthorizationConfigWithMode
  | OIDCAuthorizationConfigWithMode
  | ApiKeyAuthorizationConfigWithMode
  | LambdaAuthorizationConfigWithMode;

export type AuthorizationConfig = {
  defaultAuthMode: AuthorizationMode;
  iamConfig?: IAMAuthorizationConfig;
  userPoolConfig?: UserPoolAuthorizationConfig;
  oidcConfig?: OIDCAuthorizationConfig;
  apiKeyConfig?: ApiKeyAuthorizationConfig;
  lambdaConfig?: LambdaAuthorizationConfig;
};

export type AmplifyGraphQlApiResources = {
  api: appsync.CfnGraphQLApi;
  schema: appsync.CfnGraphQLSchema;
  apiKey?: appsync.CfnApiKey;
  resolvers: Record<string, appsync.CfnResolver>;
  appsyncFunctions: Record<string, appsync.CfnFunctionConfiguration>;
  dataSources: Record<string, appsync.CfnDataSource>;
  tables: Record<string, dynamodb.CfnTable>;
  roles: Record<string, iam.CfnRole>;
  policies: Record<string, iam.CfnPolicy>;
  additionalResources: Record<string, cdk.CfnResource>;
};

import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export type IamAuthorizationMode = {
  type: 'AWS_IAM';
  userRoleConfig?: {
    identityPoolId: string;
    authRole: iam.IRole;
    unauthRole: iam.IRole;
  },
  adminRoles?: iam.IRole[];
};

export type UserPoolAuthorizationMode = {
  type: 'AMAZON_COGNITO_USER_POOLS';
  userPool: cognito.IUserPool;
};

export type OidcAuthorizationMode = {
  type: 'OPENID_CONNECT';
  oidcProviderName: string;
  oidcIssuerUrl: string;
  clientId?: string;
  tokenExpiryFromAuth: cdk.Duration;
  tokenExpiryFromIssue: cdk.Duration;
};

export type ApiKeyAuthorizationMode = {
  type: 'API_KEY';
  description?: string;
  expires: cdk.Duration;
};

export type LambdaAuthorizationMode = {
  type: 'AWS_LAMBDA';
  function: lambda.IFunction;
  ttl: cdk.Duration;
};

export type AuthorizationMode =
  | IamAuthorizationMode
  | UserPoolAuthorizationMode
  | OidcAuthorizationMode
  | ApiKeyAuthorizationMode
  | LambdaAuthorizationMode;

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

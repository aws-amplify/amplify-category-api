import { AuthorizationModes, IAmplifyGraphqlDefinition } from '../types';

export const getMetadataDataSources = (definition: IAmplifyGraphqlDefinition): string => {
  const dataSourceDbTypes = Object.values(definition.dataSourceStrategies).map((strategy) => strategy.dbType.toLocaleLowerCase());
  const customSqlDbTypes = (definition.customSqlDataSourceStrategies ?? []).map((strategy) => strategy.strategy.dbType.toLocaleLowerCase());
  const dataSources = [...new Set([...dataSourceDbTypes, ...customSqlDbTypes])].sort();
  return dataSources.join(',');
};

export const getMetadataAuthorizationModes = (authorizationModes: AuthorizationModes): string => {
  const configKeyToAuthMode: Record<string, string> = {
    iamConfig: 'aws_iam',
    oidcConfig: 'openid_connect',
    identityPoolConfig: 'amazon_cognito_identity_pools',
    userPoolConfig: 'amazon_cognito_user_pools',
    apiKeyConfig: 'api_key',
    lambdaConfig: 'aws_lambda',
  };
  const authModes = Object.keys(authorizationModes)
    .map((mode) => configKeyToAuthMode[mode])
    // remove values not found in mapping
    .filter((mode) => !!mode)
    .sort();
  return authModes.join(',');
};

export const getMetadataCustomOperations = (definition: IAmplifyGraphqlDefinition): string => {
  const customOperations: string[] = [];
  if (definition.schema.includes('type Query')) {
    customOperations.push('queries');
  }
  if (definition.schema.includes('type Mutation')) {
    customOperations.push('mutations');
  }
  if (definition.schema.includes('type Subscription')) {
    customOperations.push('subscriptions');
  }

  return customOperations.join(',');
};

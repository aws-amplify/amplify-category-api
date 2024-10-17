import { AuthorizationModes, IAmplifyGraphqlDefinition } from '../types';

export const getMetadataDataSources = (definition: IAmplifyGraphqlDefinition): string => {
  const dataSourceDbTypes = Object.values(definition.dataSourceStrategies).map((strategy) => strategy.dbType.toLocaleLowerCase());
  const customSqlDbTypes = (definition.customSqlDataSourceStrategies ?? []).map((strategy) => strategy.strategy.dbType.toLocaleLowerCase());
  const dataSources = [...new Set([...dataSourceDbTypes, ...customSqlDbTypes])].sort();
  return dataSources.join(',');
};

export const getMetadataAuthorizationModes = (authorizationModes: AuthorizationModes): string => {
  const configKeyToAuthMode: Record<string, string> = {
    iamConfig: 'AWS_IAM',
    oidcConfig: 'OPENID_CONNECT',
    identityPoolConfig: 'AMAZON_COGNITO_IDENTITY_POOLS',
    userPoolConfig: 'AMAZON_COGNITO_USER_POOLS',
    apiKeyConfig: 'API_KEY',
    lambdaConfig: 'AWS_LAMBDA',
  };
  const authModes = Object.keys(authorizationModes)
    .map((mode) => configKeyToAuthMode[mode])
    .filter((mode) => !!mode);
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

  return customOperations.join(',');
};

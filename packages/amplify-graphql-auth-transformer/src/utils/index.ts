import { DirectiveWrapper, InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import {
  AppSyncAuthMode,
  TransformerBeforeStepContextProvider,
  TransformerContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode } from 'graphql';
import { Construct } from 'constructs';
import { MODEL_OPERATIONS, READ_MODEL_OPERATIONS } from './constants';
import {
  AuthProvider,
  AuthRule,
  ConfiguredAuthProviders,
  GetAuthRulesOptions,
  ModelOperation,
  RoleDefinition,
  RolesByProvider,
} from './definitions';

export * from './constants';
export * from './definitions';
export * from './validations';
export * from './schema';
export * from './iam';

/**
 * Splits roles into key value pairs by auth type
 */
export const splitRoles = (roles: Array<RoleDefinition>): RolesByProvider => ({
  cognitoStaticRoles: roles.filter((r) => r.static && isAuthProviderEqual(r.provider, 'userPools')),
  cognitoDynamicRoles: roles.filter((r) => !r.static && isAuthProviderEqual(r.provider, 'userPools')),
  oidcStaticRoles: roles.filter((r) => r.static && isAuthProviderEqual(r.provider, 'oidc')),
  oidcDynamicRoles: roles.filter((r) => !r.static && isAuthProviderEqual(r.provider, 'oidc')),
  iamRoles: roles.filter((r) => isAuthProviderEqual(r.provider, 'identityPool')),
  apiKeyRoles: roles.filter((r) => isAuthProviderEqual(r.provider, 'apiKey')),
  lambdaRoles: roles.filter((r) => isAuthProviderEqual(r.provider, 'function')),
});

/**
 * returns @auth directive rules
 */
export const getAuthDirectiveRules = (authDir: DirectiveWrapper, options?: GetAuthRulesOptions): AuthRule[] => {
  const splitReadOperation = (rule: AuthRule): void => {
    const operations: (ModelOperation | 'read')[] = rule.operations ?? [];
    const indexOfRead = operations.indexOf('read', 0);
    if (indexOfRead !== -1) {
      operations.splice(indexOfRead, 1);
      operations.push('get');
      operations.push('list');
      operations.push('listen');
      if (!options?.isSqlDataSource) {
        operations.push('search');
        operations.push('sync');
      }
      // eslint-disable-next-line no-param-reassign
      rule.operations = operations as ModelOperation[];
    }
  };

  const { rules } = authDir.getArguments<{ rules: Array<AuthRule> }>({ rules: [] }, options);
  rules?.forEach((rule) => {
    const operations: (ModelOperation | 'read')[] = rule.operations ?? MODEL_OPERATIONS;

    // In case a customer defines a single dynamic group as a string, put it to an array
    if (rule.groups && typeof rule.groups === 'string') {
      // eslint-disable-next-line no-param-reassign
      rule.groups = [rule.groups];
    }

    if (
      options?.isField &&
      rule.operations &&
      rule.operations.some((operation: ModelOperation | 'read') => operation !== 'read' && READ_MODEL_OPERATIONS.includes(operation))
    ) {
      const offendingOperation = operations.filter((operation) => operation !== 'read' && READ_MODEL_OPERATIONS.includes(operation));
      throw new InvalidDirectiveError(`'${offendingOperation}' operation is not allowed at the field level.`);
    }

    if (operations.includes('read') && operations.some((operation) => operation !== 'read' && READ_MODEL_OPERATIONS.includes(operation))) {
      const offendingOperation = operations.filter((operation) => operation !== 'read' && READ_MODEL_OPERATIONS.includes(operation));
      throw new InvalidDirectiveError(
        `'${offendingOperation}' operations are specified in addition to 'read'. Either remove 'read' to limit access only to '${offendingOperation}' or only keep 'read' to grant all ${READ_MODEL_OPERATIONS} access.`,
      );
    }

    if (!rule.provider) {
      switch (rule.allow) {
        case 'owner':
        case 'groups':
          // eslint-disable-next-line no-param-reassign
          rule.provider = 'userPools';
          break;
        case 'private':
          // eslint-disable-next-line no-param-reassign
          rule.provider = 'userPools';
          break;
        case 'public':
          // eslint-disable-next-line no-param-reassign
          rule.provider = 'apiKey';
          break;
        case 'custom':
          // eslint-disable-next-line no-param-reassign
          rule.provider = 'function';
          break;
        default:
          throw new Error(`Need to specify an allow to assigned a provider: ${rule}`);
      }
    }

    if (isAuthProviderEqual(rule.provider, 'identityPool')) {
      // eslint-disable-next-line no-param-reassign
      rule.generateIAMPolicy = true;
    }

    splitReadOperation(rule);
  });

  return rules;
};

/**
 * gets stack name if the field is paired with function, predictions, or by itself
 */
export const getScopeForField = (
  ctx: TransformerContextProvider,
  obj: ObjectTypeDefinitionNode,
  fieldName: string,
  hasModelDirective: boolean,
): Construct => {
  const fieldNode = obj.fields.find((f) => f.name.value === fieldName);
  const fieldDirectives = fieldNode.directives.map((d) => d.name.value);
  if (fieldDirectives.includes('function')) {
    return ctx.stackManager.getStack('FunctionDirectiveStack');
  }
  if (fieldDirectives.includes('predictions')) {
    return ctx.stackManager.getStack('PredictionsDirectiveStack');
  }
  if (fieldDirectives.includes('sql')) {
    return ctx.stackManager.getStack('CustomSQLStack');
  }
  if (hasModelDirective) {
    return ctx.stackManager.getStack(obj.name.value);
  }
  return ctx.stackManager.scope;
};

/**
 * Returns auth provider passed on config
 */
export const getConfiguredAuthProviders = (context: TransformerBeforeStepContextProvider): ConfiguredAuthProviders => {
  const { authConfig, synthParameters } = context;
  const { adminRoles, identityPoolId } = synthParameters;
  const providers = [
    authConfig.defaultAuthentication.authenticationType,
    ...authConfig.additionalAuthenticationProviders.map((p) => p.authenticationType),
  ];
  const getAuthProvider = (authType: AppSyncAuthMode): AuthProvider => {
    switch (authType) {
      case 'AMAZON_COGNITO_USER_POOLS':
        return 'userPools';
      case 'API_KEY':
        return 'apiKey';
      case 'AWS_IAM':
        return 'identityPool';
      case 'OPENID_CONNECT':
        return 'oidc';
      case 'AWS_LAMBDA':
        return 'function';
      default:
        return 'apiKey';
    }
  };
  const hasIAM = providers.some((p) => p === 'AWS_IAM');
  const hasAdminRolesEnabled = hasIAM && adminRoles?.length > 0;
  /**
   * When AdminUI or generic IAM access is enabled, all the types and operations get IAM auth. If the default auth mode is
   * not IAM all the fields will need to have the default auth mode directive to ensure both IAM and default
   * auth modes are allowed to access
   * default auth provider needs to be added if AdminUI or generic IAM access is enabled and default auth type is not IAM
   */
  const shouldAddDefaultServiceDirective =
    (hasAdminRolesEnabled || context.synthParameters.enableIamAccess) && authConfig.defaultAuthentication.authenticationType !== 'AWS_IAM';
  const configuredProviders: ConfiguredAuthProviders = {
    default: getAuthProvider(authConfig.defaultAuthentication.authenticationType),
    onlyDefaultAuthProviderConfigured: authConfig.additionalAuthenticationProviders.length === 0,
    hasAdminRolesEnabled,
    hasIdentityPoolId: identityPoolId !== null && identityPoolId !== undefined,
    hasApiKey: providers.some((p) => p === 'API_KEY'),
    hasUserPools: providers.some((p) => p === 'AMAZON_COGNITO_USER_POOLS'),
    hasOIDC: providers.some((p) => p === 'OPENID_CONNECT'),
    hasLambda: providers.some((p) => p === 'AWS_LAMBDA'),
    hasIAM,
    shouldAddDefaultServiceDirective,
    genericIamAccessEnabled: synthParameters.enableIamAccess,
  };
  return configuredProviders;
};

export const isAuthProviderEqual = (provider: AuthProvider, otherProvider: AuthProvider): boolean => {
  if (provider === otherProvider) {
    return true;
  }

  if ((provider === 'iam' || provider === 'identityPool') && (otherProvider === 'iam' || otherProvider === 'identityPool')) {
    return true;
  }

  return false;
};

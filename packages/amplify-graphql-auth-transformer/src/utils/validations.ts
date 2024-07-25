import {
  DirectiveWrapper,
  InvalidDirectiveError,
  generateGetArgumentsInput,
  isModelType,
  isSqlModel,
} from '@aws-amplify/graphql-transformer-core';
import type {
  TransformParameters,
  TransformerContextProvider,
  DataSourceStrategiesProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode } from 'graphql';
import { AuthRule, ConfiguredAuthProviders } from './definitions';
import { isAuthProviderEqual } from './index';

export const validateRuleAuthStrategy = (rule: AuthRule, configuredAuthProviders: ConfiguredAuthProviders) => {
  //
  // Groups
  //
  if (rule.allow === 'groups' && rule.provider !== 'userPools' && rule.provider !== 'oidc') {
    throw new InvalidDirectiveError(
      `@auth directive with 'groups' strategy only supports 'userPools' and 'oidc' providers, but found '${rule.provider}' assigned.`,
    );
  }
  if (rule.allow === 'groups' && !rule.groups && !rule.groupsField) {
    throw new InvalidDirectiveError(`@auth directive with 'groups' should have a defined groups list or a groupsField.`);
  }

  //
  // Owner
  //
  if (rule.allow === 'owner') {
    if (rule.provider && rule.provider !== 'userPools' && rule.provider !== 'oidc') {
      throw new InvalidDirectiveError(
        `@auth directive with 'owner' strategy only supports 'userPools' (default) and 'oidc' providers, but \
found '${rule.provider}' assigned.`,
      );
    }
  }

  //
  // Public
  //
  if (rule.allow === 'public') {
    if (rule.provider && !isAuthProviderEqual(rule.provider, 'apiKey') && !isAuthProviderEqual(rule.provider, 'identityPool')) {
      throw new InvalidDirectiveError(
        `@auth directive with 'public' strategy only supports 'apiKey' (default) and 'identityPool' providers, but \
found '${rule.provider}' assigned.`,
      );
    }
  }

  //
  // Private
  //
  if (rule.allow === 'private') {
    if (
      rule.provider &&
      !isAuthProviderEqual(rule.provider, 'userPools') &&
      !isAuthProviderEqual(rule.provider, 'identityPool') &&
      !isAuthProviderEqual(rule.provider, 'oidc')
    ) {
      throw new InvalidDirectiveError(
        `@auth directive with 'private' strategy only supports 'userPools' (default) and 'identityPool' providers, but \
found '${rule.provider}' assigned.`,
      );
    }
  }

  //
  // Custom
  //
  if (rule.allow === 'custom') {
    if (rule.provider && rule.provider !== 'function') {
      throw new InvalidDirectiveError(
        `@auth directive with 'custom' strategy only supports 'function' (default) provider, but \
found '${rule.provider}' assigned.`,
      );
    }
  }

  //
  // Validate provider values against project configuration.
  //
  if (rule.provider === 'apiKey' && configuredAuthProviders.hasApiKey === false) {
    throw new InvalidDirectiveError(
      `@auth directive with 'apiKey' provider found, but the project has no API Key authentication provider configured.`,
    );
  } else if (rule.provider === 'oidc' && configuredAuthProviders.hasOIDC === false) {
    throw new InvalidDirectiveError(
      `@auth directive with 'oidc' provider found, but the project has no OPENID_CONNECT authentication provider configured.`,
    );
  } else if (rule.provider === 'userPools' && configuredAuthProviders.hasUserPools === false) {
    throw new InvalidDirectiveError(
      `@auth directive with 'userPools' provider found, but the project has no Cognito User Pools authentication provider configured.`,
    );
  } else if (rule.provider === 'iam' && configuredAuthProviders.hasIAM === false) {
    throw new InvalidDirectiveError(
      `@auth directive with 'iam' provider found, but the project has no IAM authentication provider configured.`,
    );
  } else if (rule.provider === 'identityPool' && configuredAuthProviders.hasIAM === false) {
    throw new InvalidDirectiveError(
      `@auth directive with 'identityPool' provider found, but the project has no IAM authentication provider configured.`,
    );
  } else if (rule.provider === 'function' && configuredAuthProviders.hasLambda === false) {
    throw new InvalidDirectiveError(
      `@auth directive with 'function' provider found, but the project has no Lambda authentication provider configured.`,
    );
  }
};

export const validateRules = (
  rules: AuthRule[],
  configuredAuthProviders: ConfiguredAuthProviders,
  typeName: string,
  dataSourceStrategies: DataSourceStrategiesProvider,
): void => {
  if (rules.length === 0) {
    throw new InvalidDirectiveError(`@auth on ${typeName} does not have any auth rules.`);
  }
  for (const rule of rules) {
    validateRuleAuthStrategy(rule, configuredAuthProviders);
    commonRuleValidation(rule);
    validateRuleOperations(rule, dataSourceStrategies, typeName);
  }
};

const validateRuleOperations = (
  rule: AuthRule,
  dataSourceStrategies: DataSourceStrategiesProvider,
  typeName: string,
  fieldName?: string,
): void => {
  if (!isModelType(dataSourceStrategies, typeName) || !isSqlModel(dataSourceStrategies, typeName)) {
    return;
  }
  if (!rule.operations || rule.operations.length === 0) {
    return;
  }
  if (rule.operations.includes('sync')) {
    throw new InvalidDirectiveError(
      `@auth on ${typeName}${fieldName ? `.${fieldName}` : ''} cannot specify 'sync' operation as it is not supported for SQL data sources`,
    );
  }
  if (rule.operations.includes('search')) {
    throw new InvalidDirectiveError(
      `@auth on ${typeName}${
        fieldName ? `.${fieldName}` : ''
      } cannot specify 'search' operation as it is not supported for SQL data sources`,
    );
  }
};

export const validateFieldRules = (
  authDir: DirectiveWrapper,
  isParentTypeBuiltinType: boolean,
  parentHasModelDirective: boolean,
  fieldName: string,
  transformParameters: TransformParameters,
  parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
  dataSourceStrategies: DataSourceStrategiesProvider,
): void => {
  const rules = authDir.getArguments<{ rules: Array<AuthRule> }>({ rules: [] }, generateGetArgumentsInput(transformParameters)).rules;

  if (rules.length === 0) {
    throw new InvalidDirectiveError(`@auth on ${fieldName} does not have any auth rules.`);
  }
  for (const rule of rules) {
    if (isParentTypeBuiltinType && rule.operations && rule.operations.length > 0) {
      throw new InvalidDirectiveError(
        `@auth rules on fields within Query, Mutation, Subscription cannot specify 'operations' argument as these rules \
are already on an operation already.`,
      );
    }

    if (!parentHasModelDirective && rule.operations && rule.operations.length > 0) {
      throw new InvalidDirectiveError(
        `@auth rules on fields within types that does not have @model directive cannot specify 'operations' argument as there are \
operations will be generated by the CLI.`,
      );
    }

    const typeName = parent.name.value;
    validateRuleOperations(rule, dataSourceStrategies, typeName, fieldName);
  }
};

// common rule validation between obj and field
export const commonRuleValidation = (rule: AuthRule) => {
  const { identityClaim, allow, groups, groupsField, groupClaim } = rule;
  if (allow === 'groups' && identityClaim) {
    throw new InvalidDirectiveError(`
          @auth identityClaim can only be used for 'allow: owner'`);
  }
  if (allow === 'owner' && groupClaim) {
    throw new InvalidDirectiveError(`
          @auth groupClaim can only be used 'allow: groups'`);
  }
  if (groupsField && groups) {
    throw new InvalidDirectiveError('This rule has groupsField and groups, please use one or the other');
  }
  if (allow === 'groups' && groups && groups.length < 1) {
    throw new InvalidDirectiveError('@auth rules using groups cannot have an empty list');
  }
};

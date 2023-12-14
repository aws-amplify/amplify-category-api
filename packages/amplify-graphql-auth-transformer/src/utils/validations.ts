import { DirectiveWrapper, InvalidDirectiveError, generateGetArgumentsInput, isSqlModel } from '@aws-amplify/graphql-transformer-core';
import type {
  TransformParameters,
  TransformerSchemaVisitStepContextProvider,
  TransformerContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode } from 'graphql';
import { AuthRule, ConfiguredAuthProviders } from './definitions';

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
    if (rule.provider && rule.provider !== 'apiKey' && rule.provider !== 'iam') {
      throw new InvalidDirectiveError(
        `@auth directive with 'public' strategy only supports 'apiKey' (default) and 'iam' providers, but \
found '${rule.provider}' assigned.`,
      );
    }
  }

  //
  // Private
  //
  if (rule.allow === 'private') {
    if (rule.provider && rule.provider !== 'userPools' && rule.provider !== 'iam' && rule.provider !== 'oidc') {
      throw new InvalidDirectiveError(
        `@auth directive with 'private' strategy only supports 'userPools' (default) and 'iam' providers, but \
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
  } else if (rule.provider === 'function' && configuredAuthProviders.hasLambda === false) {
    throw new InvalidDirectiveError(
      `@auth directive with 'function' provider found, but the project has no Lambda authentication provider configured.`,
    );
  }
};

export const validateRules = (rules: AuthRule[], configuredAuthProviders: ConfiguredAuthProviders, typeName: string) => {
  if (rules.length === 0) {
    throw new InvalidDirectiveError(`@auth on ${typeName} does not have any auth rules.`);
  }
  for (const rule of rules) {
    validateRuleAuthStrategy(rule, configuredAuthProviders);
    commonRuleValidation(rule);
  }
};

export const validateFieldRules = (
  authDir: DirectiveWrapper,
  isParentTypeBuiltinType: boolean,
  parentHasModelDirective: boolean,
  fieldName: string,
  transformParameters: TransformParameters,
  parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
  context: TransformerSchemaVisitStepContextProvider,
): void => {
  const rules = authDir.getArguments<{ rules: Array<AuthRule> }>({ rules: [] }, generateGetArgumentsInput(transformParameters)).rules;

  if (!isParentTypeBuiltinType && parentHasModelDirective && isSqlModel(context as TransformerContextProvider, parent.name.value)) {
    throw new InvalidDirectiveError(
      `@auth rules are not supported on fields on relational database models. Check field "${fieldName}" on type "${parent.name.value}". Please use @auth on the type instead.`,
    );
  }

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

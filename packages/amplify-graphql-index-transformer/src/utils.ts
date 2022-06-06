import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ListValueNode, ObjectValueNode, StringValueNode } from 'graphql';
import { plurality, toUpper } from 'graphql-transformer-common';
import { IndexDirectiveConfiguration, PrimaryKeyDirectiveConfiguration } from './types';

export function lookupResolverName(config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider, op: string): string | null {
  const { object, modelDirective } = config;
  const argName = op === 'get' || op === 'list' || op === 'sync' ? 'queries' : 'mutations';
  let resolverName;

  // Check if @model overrides the default resolver names.
  for (const argument of modelDirective.arguments!) {
    const arg = argument as any;

    if (arg.name.value !== argName || !Array.isArray(arg.value.fields)) {
      continue;
    }

    for (const field of arg.value.fields) {
      if (field.name.value === op) {
        resolverName = field.value.value;

        if (!resolverName) {
          return null;
        }
      }
    }
  }

  if (!resolverName) {
    const capitalizedName = toUpper(object.name.value);

    if (op === 'list' || op === 'sync') {
      resolverName = `${op}${plurality(capitalizedName, true)}`;
    } else {
      resolverName = `${op}${capitalizedName}`;
    }
  }

  return resolverName;
}

export function validateNotSelfReferencing(config: IndexDirectiveConfiguration | PrimaryKeyDirectiveConfiguration) {
  const { directive, field, sortKeyFields } = config;
  const fieldName = field.name.value;

  for (const sortKeyField of sortKeyFields) {
    if (sortKeyField === fieldName) {
      throw new InvalidDirectiveError(`@${directive.name.value} field '${fieldName}' cannot reference itself.`);
    }
  }
}

/**
 * Checks if @auth owner field has been set to a sortKeyField for @primaryKey
 */
export const validateNotOwnerAuth = (
  sortKeyField: string,
  config: PrimaryKeyDirectiveConfiguration,
  ctx: TransformerContextProvider,
): boolean => {
  const { object } = config;

  const authDir = object.directives?.find(dir => dir.name.value === 'auth');

  if (!authDir) return true;

  const dirRules = (authDir.arguments?.find(arg => arg.name.value === 'rules')?.value as ListValueNode).values;
  const ownerRules = dirRules.filter(rule => {
    let isOwner = false;
    let hasIdentityClaimField = false;
    let hasOwnerFieldField = false;
    let usesMultiClaim = false;
    let sortKeyFieldIsAuthField = false;

    (rule as ObjectValueNode).fields?.forEach(field => {
      const name = field.name.value;
      const { value } = field?.value as StringValueNode;

      if (name === 'allow' && value === 'owner') {
        isOwner = true;
      }

      if (name === 'identityClaim') {
        hasIdentityClaimField = true;

        if (value === 'sub::username') {
          usesMultiClaim = true;
        }
      }

      if (name === 'ownerField') {
        hasOwnerFieldField = true;

        if (value === sortKeyField) {
          sortKeyFieldIsAuthField = true;
        }
      }
    });
    const featureFlagEnabled = ctx.featureFlags.getBoolean('useSubUsernameForDefaultIdentityClaim');
    const usesSubUsernameIdentityClaim = isOwner && (usesMultiClaim || (!hasIdentityClaimField && featureFlagEnabled));
    const invalidOwnerField = sortKeyFieldIsAuthField || !hasOwnerFieldField;

    return usesSubUsernameIdentityClaim && invalidOwnerField;
  });
  return ownerRules.length === 0;
};

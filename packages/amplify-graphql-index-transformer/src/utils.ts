import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, ListValueNode, ObjectValueNode, StringValueNode, ValueNode } from 'graphql';
import { plurality, toLower, toUpper } from 'graphql-transformer-common';
import pluralize from 'pluralize';
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
  { object }: PrimaryKeyDirectiveConfiguration,
  ctx: TransformerContextProvider,
): boolean => {
  const authDir = (object.directives || []).find(collectAuthDirectives);
  const featureFlagEnabled = ctx.transformParameters.useSubUsernameForDefaultIdentityClaim;

  if (!authDir || !featureFlagEnabled) return true;

  const authDirRules = (authDir.arguments?.find((arg) => arg.name.value === 'rules')?.value as ListValueNode | undefined)?.values || [];

  return !authDirRules.map(ownerFieldsFromOwnerRule).includes(sortKeyField);
};

const collectAuthDirectives = (dir: DirectiveNode): boolean => dir.name.value === 'auth';

const ownerFieldsFromOwnerRule = (rule: ValueNode): string => {
  const ruleObject: { [key: string]: string } = {
    ownerField: 'owner', // default owner field
    identityClaim: 'sub::username', // default identity claim
  };

  ((rule as ObjectValueNode).fields || []).forEach((field) => {
    const name: string = field.name.value;
    const value: string = (field?.value as StringValueNode | undefined)?.value || '';

    ruleObject[name] = value;
  });

  if (ruleObject.allow === 'owner' && ruleObject.identityClaim.split('::').length > 1) {
    return ruleObject.ownerField;
  }

  return '';
};

/*
 * Accepts a model and field name, and potentially empty list of sortKeyFields to generate a unique index name.
 * e.g. modelName = Employee, fieldName = manager, sortKeyFields = [level]
 * will generate a name like employeeByManagerAndLevel.
 */
export const generateKeyAndQueryNameForConfig = (config: IndexDirectiveConfiguration): string => {
  const modelName = config.object.name.value;
  const fieldName = config.field.name.value;
  const { sortKeyFields } = config;
  return `${toLower(pluralize(modelName))}By${[fieldName, ...sortKeyFields].map(toUpper).join('And')}`;
};

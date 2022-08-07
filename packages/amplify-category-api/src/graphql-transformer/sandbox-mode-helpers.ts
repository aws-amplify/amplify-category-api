import chalk from 'chalk';
import { $TSContext } from 'amplify-cli-core';
import { printer } from 'amplify-prompts';
import { parse } from 'graphql';
import { hasApiKey } from './api-key-helpers';
import { promptToAddApiKey } from '../provider-utils/awscloudformation/prompt-to-add-api-key';

const AMPLIFY = 'AMPLIFY';
const AUTHORIZATION_RULE = 'AuthRule';
const ALLOW = 'allow';
const PUBLIC = 'public';

/**
 * If the app does not yet have an API key config, show a warning explaning why we need one, and prompt the user to set one up.
 * @param context the request context
 * @returns a promise of type void, or an api key config.
 */
export const showSandboxModePrompts = async (context: $TSContext): Promise<any> => {
  const appHasApiKey = await hasApiKey(context);

  if (appHasApiKey) {
    return Promise.resolve();
  }

  printer.info(
    `
⚠️  WARNING: Global Sandbox Mode has been enabled, which requires a valid API key. If
you'd like to disable, remove ${chalk.green('"input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }"')}
from your GraphQL schema and run 'amplify push' again. If you'd like to proceed with
sandbox mode disabled, do not create an API Key.
`,
    'yellow',
  );

  return promptToAddApiKey(context);
};

/**
 * Render out a warning about the limitations of the global api key config.
 * @param doclink link to the relevant auth docs.
 */
export const showGlobalSandboxModeWarning = (doclink: string): void => {
  printer.info(
    `
⚠️  WARNING: your GraphQL API currently allows public create, read, update, and delete access to all models via an API Key. To configure PRODUCTION-READY authorization rules, review: ${doclink}
`,
    'yellow',
  );
};

/**
 * Return whether or not a globla auth rule is defined on the AMPLIFY input object.
 * @param field the field definition to check
 * @returns true if the globalAuthRule name scheme is found
 */
const matchesGlobalAuth = (field: any): boolean => ['global_auth_rule', 'globalAuthRule'].includes(field.name.value);

export const schemaHasSandboxModeEnabled = (schema: string, docLink: string): boolean => {
  const { definitions } = parse(schema);
  const amplifyInputType: any = definitions.find((d: any) => d.kind === 'InputObjectTypeDefinition' && d.name.value === AMPLIFY);

  if (!amplifyInputType) {
    return false;
  }

  const authRuleField = amplifyInputType.fields.find(matchesGlobalAuth);

  if (!authRuleField) {
    throw Error(`input AMPLIFY requires "globalAuthRule" field. Learn more here: ${docLink}`);
  }

  const typeName = authRuleField.type.name.value;
  const defaultValueField = authRuleField.defaultValue.fields[0];
  const defaultValueName = defaultValueField.name.value;
  const defaultValueValue = defaultValueField.value.value;
  const authScalarMatch = typeName === AUTHORIZATION_RULE;
  const defaultValueNameMatch = defaultValueName === ALLOW;
  const defaultValueValueMatch = defaultValueValue === PUBLIC;

  if (authScalarMatch && defaultValueNameMatch && defaultValueValueMatch) {
    return true;
  }

  throw Error(`There was a problem with your auth configuration. Learn more about auth here: ${docLink}`);
};

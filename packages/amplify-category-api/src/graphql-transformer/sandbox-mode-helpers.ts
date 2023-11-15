/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */
import chalk from 'chalk';
import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { parse } from 'graphql';
import { hasApiKey } from './api-key-helpers';

const AMPLIFY = 'AMPLIFY';
const AUTHORIZATION_RULE = 'AuthRule';
const ALLOW = 'allow';
const PUBLIC = 'public';

// eslint-disable-next-line consistent-return
export async function showSandboxModePrompts(context: $TSContext): Promise<any> {
  if (!(await hasApiKey(context))) {
    printer.info(
      `
⚠️  WARNING: Global Sandbox Mode has been enabled, which requires a valid API key. If
you'd like to disable, remove ${chalk.green('"input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }"')}
from your GraphQL schema and run 'amplify push' again. If you'd like to proceed with
sandbox mode disabled, do not create an API Key.
`,
      'yellow',
    );
    // eslint-disable-next-line no-return-await
    return await context.amplify.invokePluginMethod(context, 'api', undefined, 'promptToAddApiKey', [context]);
  }
}

export function showGlobalSandboxModeWarning(doclink: string): void {
  printer.info(
    `
⚠️  WARNING: your GraphQL API currently allows public create, read, update, and delete access to all models via an API Key. To configure PRODUCTION-READY authorization rules, review: ${doclink}
`,
    'yellow',
  );
}

function matchesGlobalAuth(field: any): boolean {
  return ['global_auth_rule', 'globalAuthRule'].includes(field.name.value);
}

export function schemaHasSandboxModeEnabled(schema: string, docLink: string): boolean {
  const { definitions } = parse(schema);
  const amplifyInputType: any = definitions.find((d: any) => d.kind === 'InputObjectTypeDefinition' && d.name.value === AMPLIFY);
  if (!amplifyInputType) {
    return false;
  }

  const authRuleField = amplifyInputType.fields.find(matchesGlobalAuth);

  if (!authRuleField) {
    return false;
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
}

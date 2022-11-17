/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */
import chalk from 'chalk';
import { $TSContext } from 'amplify-cli-core';
import { printer } from 'amplify-prompts';
import { parse } from 'graphql';
import { InvalidBracketsError } from '@aws-amplify/graphql-transformer-core';
import { hasApiKey } from './api-key-helpers';

const AMPLIFY = 'AMPLIFY';
const AUTHORIZATION_RULE = 'AuthRule';
const ALLOW = 'allow';
const PUBLIC = 'public';

interface BracketCheckParameters {
  consecutiveQuotes: number,
  checkStatus: boolean,
  multilineComment: boolean
}

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

function toggleBracketCheck(c: string, consecutiveQuotes: number, checkStatus: boolean, multilineComment: boolean): BracketCheckParameters {
  let quoteCount = consecutiveQuotes;
  switch (c) {
    case '"':
      quoteCount++;
      if (quoteCount >= 3 && checkStatus) {
        return { consecutiveQuotes: 0, checkStatus: false, multilineComment: true };
      } if (quoteCount >= 3) {
        return { consecutiveQuotes: quoteCount, checkStatus: true, multilineComment: false };
      }
      break;
    case '#':
      if (!multilineComment) return { consecutiveQuotes, checkStatus: false, multilineComment };
      break;
    case '\n':
      if (!multilineComment) return { consecutiveQuotes, checkStatus: true, multilineComment };
      break;
    default: break;
  }
  return { consecutiveQuotes: quoteCount, checkStatus, multilineComment };
}

function bracketCheck(schema: string): void {
  const stack = [];
  let consecutiveQuotes = 0;
  let multilineComment = false;
  let checkStatus = true;
  const inverseBrackets = { '{': '}', '[': ']', '(': ')' };
  let currentLine = 1;
  for (let i = 0; i < schema.length; i++) {
    const c = schema.charAt(i);
    const bracketCheckParams = toggleBracketCheck(c, consecutiveQuotes, checkStatus, multilineComment);
    consecutiveQuotes = bracketCheckParams.consecutiveQuotes;
    checkStatus = bracketCheckParams.checkStatus;
    multilineComment = bracketCheckParams.multilineComment;
    if (c === '\n') currentLine++;
    if (checkStatus) {
      switch (c) {
        case '(':
        case '[':
        case '{':
          stack.push([inverseBrackets[c], currentLine]);
          break;
        case ')':
        case ']':
        case '}': {
          const popped = stack.pop();
          if (c !== (popped ? popped[0] : null)) {
            throw new InvalidBracketsError(`Syntax Error: mismatched brackets found in the schema. Unexpected ${c} at line ${currentLine} in the schema.`);
          }
          break;
        }
        default:
          break;
      }
    }
  }
  if (stack.length) {
    const popped = stack.pop();
    throw new InvalidBracketsError(`Syntax Error: mismatched brackets found in the schema. Missing ${popped[0]} at line ${popped[1]} in the schema.`);
  }
}

export function schemaHasSandboxModeEnabled(schema: string, docLink: string): boolean {
  bracketCheck(schema);
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
  throw Error(
    `There was a problem with your auth configuration. Learn more about auth here: ${docLink}`,
  );
}

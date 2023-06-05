import { getEnvParamManager } from '@aws-amplify/amplify-environment-parameters';
import { pathManager } from '@aws-amplify/amplify-cli-core';
import { DocumentNode } from 'graphql/language';
import { visit } from 'graphql';
import { collectDirectives, collectDirectivesByTypeNames, APICategory } from '@aws-amplify/graphql-transformer-core';
import * as fs from 'fs-extra';
import * as path from 'path';
import { listContainsOnlySetString } from './utils';

/**
 *
 * @param apiName
 */
export function graphQLUsingSQL(apiName: string): boolean {
  const apiParameterManager = getEnvParamManager().getResourceParamManager(APICategory, apiName);
  return !!apiParameterManager.getParam('rdsClusterIdentifier');
}

/**
 *
 * @param schema
 */
export function detectCustomRootTypes(schema: DocumentNode): boolean {
  let customResolversUsed = false;
  visit(schema, {
    ObjectTypeDefinition: {
      enter(node) {
        if (node.name.value === 'Mutation' || node.name.value === 'Query' || node.name.value === 'Subscription') {
          customResolversUsed = true;
        }
      },
    },
  });
  return customResolversUsed;
}

/**
 *
 * @param apiName
 */
export function detectOverriddenResolvers(apiName: string): boolean {
  const resolversDir = path.join(pathManager.getResourceDirectoryPath(undefined, 'api', apiName), 'resolvers');
  if (!fs.existsSync(resolversDir)) {
    return false;
  }
  const vtlFiles = fs.readdirSync(resolversDir).filter((file) => file.endsWith('.vtl'));
  return !!vtlFiles.length;
}

/**
 *
 * @param schema
 */
export async function detectPassthroughDirectives(schema: string): Promise<Array<string>> {
  const supportedDirectives = new Set<string>(['connection', 'key', 'auth', 'model', 'function', 'predictions', 'aws_subscribe']);
  const directiveMap: any = collectDirectivesByTypeNames(schema).types;
  const passthroughDirectiveSet = new Set<string>();
  for (const type of Object.keys(directiveMap)) {
    for (const dirName of listContainsOnlySetString(directiveMap[type], supportedDirectives)) {
      passthroughDirectiveSet.add(dirName);
    }
  }

  return Array.from(passthroughDirectiveSet);
}

/**
 *
 * @param schema
 */
export function detectDeprecatedConnectionUsage(schema: string): boolean {
  const directives = collectDirectives(schema);
  const deprecatedConnectionArgs = ['name', 'keyField', 'sortField', 'limit'];
  const connectionDirectives = directives.filter((directive) => directive.name.value === 'connection');
  for (const connDir of connectionDirectives) {
    if (connDir.arguments?.some((arg) => deprecatedConnectionArgs.includes(arg.name.value))) {
      return true;
    }
  }
  return false;
}

/**
 *
 * @param schema
 */
export function authRuleUsesQueriesOrMutations(schema: string): boolean {
  const authDirectives = collectDirectives(schema).filter((directive) => directive.name.value === 'auth');

  for (const authDir of authDirectives) {
    const rulesArg = authDir.arguments?.filter((arg) => arg.name.value === 'rules' && arg.value.kind === 'ListValue').map((arg: any) => arg.value.values)
      ?? [];

    for (const rules of rulesArg) {
      for (const rule of rules) {
        for (const field of rule.fields) {
          const fieldName = field.name.value;

          if (fieldName === 'queries' || fieldName === 'mutations') {
            return true;
          }
        }
      }
    }
  }

  return false;
}

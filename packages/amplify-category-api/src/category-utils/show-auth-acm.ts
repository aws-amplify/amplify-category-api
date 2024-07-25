import { $TSContext, FeatureFlags, pathManager, stateManager } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import {
  AccessControlMatrix,
  AuthRule,
  DEFAULT_GROUPS_FIELD,
  DEFAULT_GROUP_CLAIM,
  DEFAULT_OWNER_FIELD,
  getAuthDirectiveRules,
  ModelOperation,
  MODEL_OPERATIONS,
} from '@aws-amplify/graphql-auth-transformer';
import { DirectiveWrapper } from '@aws-amplify/graphql-transformer-core';
import { DirectiveNode, FieldDefinitionNode, ObjectTypeDefinitionNode, parse } from 'graphql';
import { readProjectSchema } from 'graphql-transformer-core';
import * as path from 'path';
import { getTransformerVersion } from '../graphql-transformer';

export const showApiAuthAcm = async (context: $TSContext, modelName: string): Promise<void> => {
  const providerPlugin = await import(context.amplify.getProviderPlugins(context)?.awscloudformation);
  const transformerVersion = await getTransformerVersion(context);

  if (transformerVersion < 2) {
    printer.error('This command requires version two or greater of the GraphQL transformer.');
    return;
  }

  const apiNames = Object.entries(stateManager.getMeta()?.api || {})
    .filter(([, apiResource]) => (apiResource as any).service === 'AppSync')
    .map(([name]) => name);

  if (apiNames.length === 0) {
    printer.info('No GraphQL API configured in the project. To add a GraphQL API run `amplify add api`.');
    return;
  }

  if (apiNames.length > 1) {
    // this condition should never hit as we only allow a single GraphQL API per project.
    printer.error(
      'You have multiple GraphQL APIs in the project. Only one GraphQL API is allowed per project. Run `amplify remove api` to remove an API.',
    );
    return;
  }

  // Do a full schema compilation to make sure we are not printing an ACM for an invalid schema
  try {
    await providerPlugin.compileSchema(context, {
      forceCompile: true,
    });
  } catch (error) {
    printer.warn('ACM generation requires a valid schema, the provided schema is invalid.');

    if (error.name) {
      printer.error(`${error.name}: ${error.message?.trim()}`);
    } else {
      printer.error(`An error has occurred during schema compilation: ${error.message?.trim()}`);
    }

    return;
  }

  const apiName = apiNames[0];
  const apiResourceDir = path.join(pathManager.getBackendDirPath(), 'api', apiName);
  const { schema } = await readProjectSchema(apiResourceDir);

  printACM(schema, modelName);
};

export function printACM(sdl: string, nodeName: string) {
  const schema = parse(sdl);
  const type = schema.definitions.find(
    (node) =>
      node.kind === 'ObjectTypeDefinition' && node.name.value === nodeName && node?.directives?.find((dir) => dir.name.value === 'model'),
  ) as ObjectTypeDefinitionNode;
  if (!type) {
    throw new Error(`Model "${nodeName}" does not exist.`);
  } else {
    const fields: string[] = type.fields!.map((field: FieldDefinitionNode) => field.name.value);
    const acm = new AccessControlMatrix({ name: type.name.value, operations: MODEL_OPERATIONS, resources: fields });
    const parentAuthDirective = type.directives?.find((dir) => dir.name.value === 'auth');
    if (parentAuthDirective) {
      const authRules: AuthRule[] = getAuthDirectiveRules(new DirectiveWrapper(parentAuthDirective), {
        isField: false,
        deepMergeArguments: FeatureFlags.getBoolean('graphqltransformer.shouldDeepMergeDirectiveConfigDefaults'),
      });
      convertModelRulesToRoles(acm, authRules);
    }
    for (const fieldNode of type.fields || []) {
      const fieldAuthDir = fieldNode.directives?.find((dir) => dir.name.value === 'auth') as DirectiveNode;
      if (fieldAuthDir) {
        if (parentAuthDirective) {
          acm.resetAccessForResource(fieldNode.name.value);
        }
        const authRules: AuthRule[] = getAuthDirectiveRules(new DirectiveWrapper(fieldAuthDir));
        convertModelRulesToRoles(acm, authRules, fieldNode.name.value);
      }
    }
    const truthTable = acm.getAcmPerRole();

    if (truthTable.size === 0) {
      printer.warn(`No auth rules have been configured for the "${type.name.value}" model.`);
    }

    for (const [role, acm] of truthTable) {
      console.group(role);
      console.table(acm);
      console.groupEnd();
    }
  }
}

function convertModelRulesToRoles(acm: AccessControlMatrix, authRules: AuthRule[], field?: string) {
  for (const rule of authRules) {
    const operations: ModelOperation[] = rule.operations || MODEL_OPERATIONS;
    if (rule.groups && !rule.groupsField) {
      rule.groups.forEach((group) => {
        const roleName = `${rule.provider}:staticGroup:${group}`;
        acm.setRole({ role: roleName, resource: field, operations });
      });
    } else {
      let roleName: string;
      switch (rule.provider) {
        case 'apiKey':
          roleName = 'apiKey:public';
          break;
        case 'iam':
          roleName = `iam:${rule.allow}`;
          break;
        case 'oidc':
        case 'userPools':
          if (rule.allow === 'groups') {
            const groupsField = rule.groupsField || DEFAULT_GROUPS_FIELD;
            const groupsClaim = rule.groupClaim || DEFAULT_GROUP_CLAIM;
            roleName = `${rule.provider}:dynamicGroup:${groupsClaim}:${groupsField}`;
          } else if (rule.allow === 'owner') {
            const ownerField = rule.ownerField || DEFAULT_OWNER_FIELD;
            roleName = `${rule.provider}:owner:${ownerField}`;
          } else if (rule.allow === 'private') {
            roleName = `${rule.provider}:${rule.allow}`;
          } else {
            throw new Error(`Could not create a role from ${JSON.stringify(rule)}`);
          }
          break;
        default:
          throw new Error(`Could not create a role from ${JSON.stringify(rule)}`);
      }
      acm.setRole({ role: roleName, resource: field, operations });
    }
  }
}

import path from 'path';
import { $TSContext, exitOnNextTick, FeatureFlags, pathManager, stateManager } from '@aws-amplify/amplify-cli-core';
import { printer, prompter } from '@aws-amplify/amplify-prompts';
import { DirectiveNode, DocumentNode, FieldDefinitionNode, FieldNode, parse } from 'graphql';
import { collectDirectivesByType, collectDirectivesByTypeNames, readProjectConfiguration } from 'graphql-transformer-core';
import fs from 'fs-extra';
import { getApiResourceDir } from './api-resource-paths';
import { forceRefreshSchema } from './force-refresh-schema';

const setNotificationFlag = async (projectPath: string, flagName: string, value: boolean): Promise<void> => {
  await FeatureFlags.ensureFeatureFlag('graphqltransformer', flagName);

  const config = stateManager.getCLIJSON(projectPath, undefined, {
    throwIfNotExist: false,
    preserveComments: true,
  });

  if (config) {
    config.features.graphqltransformer[flagName] = value;
    stateManager.setCLIJSON(projectPath, config);
    await FeatureFlags.reloadValues();
  }
};

const loadResolvers = async (apiResourceDirectory: string): Promise<Record<string, string>> => {
  const resolvers = {};

  const resolverDirectory = path.join(apiResourceDirectory, 'build', 'resolvers');
  const resolverDirExists = fs.existsSync(resolverDirectory);
  if (resolverDirExists) {
    const resolverFiles = await fs.readdir(resolverDirectory);
    for (const resolverFile of resolverFiles) {
      if (resolverFile.indexOf('.') === 0) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const resolverFilePath = path.join(resolverDirectory, resolverFile);
      resolvers[resolverFile] = await fs.readFile(resolverFilePath, 'utf8');
    }
  }

  return resolvers;
};

/**
 * checks if we should display auth notification
 */
export const displayAuthNotification = (directiveMap: any, fieldDirectives: Set<string>): boolean => {
  const usesTransformerV2 = FeatureFlags.getNumber('graphqltransformer.transformerVersion') === 2;
  const schemaHasValues = Object.keys(directiveMap).some((typeName: string) => {
    const typeObj = directiveMap[typeName];
    const modelDirective = typeObj.find((dir: DirectiveNode) => dir.name.value === 'model');

    const subscriptionOff: boolean = (modelDirective?.arguments || []).some((arg: any) => {
      if (arg.name.value === 'subscriptions') {
        const subscriptionNull = arg.value.kind === 'NullValue';
        const levelFieldOffOrNull = arg.value?.fields?.some(
          ({ name, value }) => name.value === 'level' && (value.value === 'off' || value.kind === 'NullValue'),
        );

        return levelFieldOffOrNull || subscriptionNull;
      }
    });

    return subscriptionOff && fieldDirectives.has(typeName);
  });

  return schemaHasValues && usesTransformerV2;
};

/**
 * checks if the schema has the auth directives
 */
export const hasFieldAuthDirectives = (doc: DocumentNode): Set<string> => {
  const haveFieldAuthDir: Set<string> = new Set();

  doc.definitions?.forEach((def: any) => {
    const withAuth: FieldNode[] = (def.fields || []).filter((field: FieldDefinitionNode) => {
      const nonNullable = field.type.kind === 'NonNullType';
      const hasAuth = field.directives?.some((dir) => dir.name.value === 'auth');
      return hasAuth && nonNullable;
    });

    if (withAuth.length > 0) {
      haveFieldAuthDir.add(def.name.value);
    }
  });

  return haveFieldAuthDir;
};

/**
 * security notification
 */
export const notifyFieldAuthSecurityChange = async (context: $TSContext): Promise<boolean> => {
  const flagName = 'showFieldAuthNotification';
  const dontShowNotification = !FeatureFlags.getBoolean(`graphqltransformer.${flagName}`);

  if (dontShowNotification) return false;

  const projectPath = pathManager.findProjectRoot() ?? process.cwd();
  const apiResourceDir = await getApiResourceDir();
  if (!apiResourceDir) {
    await setNotificationFlag(projectPath, flagName, false);
    return false;
  }

  const project = await readProjectConfiguration(apiResourceDir);
  const directiveMap = collectDirectivesByType(project.schema);
  const doc: DocumentNode = parse(project.schema);
  const fieldDirectives: Set<string> = hasFieldAuthDirectives(doc);

  let schemaModified = false;
  if (displayAuthNotification(directiveMap, fieldDirectives)) {
    printer.blankLine();
    const continueChange = await prompter.yesOrNo(
      'This version of Amplify CLI introduces additional security enhancements for your GraphQL API. ' +
        "The changes are applied automatically with this deployment. This change won't impact your client code. Continue?",
    );

    if (!continueChange) {
      await context.usageData.emitSuccess();
      exitOnNextTick(0);
    }
    forceRefreshSchema();
    schemaModified = true;
  }

  await setNotificationFlag(projectPath, flagName, false);
  return schemaModified;
};

/**
 * checks if the schema has the V2 auth directives
 */
const hasV2AuthDirectives = (doc: DocumentNode): boolean => {
  let containsAuthDir = false;
  const usesTransformerV2 = FeatureFlags.getNumber('graphqltransformer.transformerVersion') === 2;

  doc.definitions?.forEach((def: any) => {
    if (def.directives?.some((dir) => dir.name.value === 'auth')) {
      containsAuthDir = true;
    }
  });

  return containsAuthDir && usesTransformerV2;
};

/**
 * security notification
 */
export const notifyListQuerySecurityChange = async (context: $TSContext): Promise<boolean> => {
  const apiResourceDir = await getApiResourceDir();
  if (!apiResourceDir) {
    return false;
  }

  const project = await readProjectConfiguration(apiResourceDir);
  const resolvers = await loadResolvers(apiResourceDir);

  const resolversToCheck = Object.entries(resolvers)
    .filter(([resolverFileName, _]) => resolverFileName.startsWith('Query.list') && resolverFileName.endsWith('.req.vtl'))
    .map(([_, resolverCode]) => resolverCode);
  const listQueryPattern =
    /#set\( \$filterExpression = \$util\.parseJson\(\$util\.transform\.toDynamoDBFilterExpression\(\$filter\)\) \)\s*(?!\s*#if\( \$util\.isNullOrEmpty\(\$filterExpression\) \))/gm;
  const resolversToSecure = resolversToCheck.filter((resolver) => listQueryPattern.test(resolver));
  if (resolversToSecure.length === 0) {
    return false;
  }

  const doc: DocumentNode = parse(project.schema);

  let schemaModified = false;
  if (hasV2AuthDirectives(doc)) {
    printer.blankLine();
    const continueChange = await prompter.yesOrNo(
      'This version of Amplify CLI introduces additional security enhancements for your GraphQL API. ' +
        "The changes are applied automatically with this deployment. This change won't impact your client code. Continue?",
    );

    if (!continueChange) {
      await context.usageData.emitSuccess();
      exitOnNextTick(0);
    }

    forceRefreshSchema();
    schemaModified = true;
  }

  return schemaModified;
};

/**
 * Checks for security enhancements in the schema and displays a warning if they are found.
 */
export const notifySecurityEnhancement = async (context: $TSContext): Promise<void> => {
  if (FeatureFlags.getBoolean('graphqltransformer.securityEnhancementNotification')) {
    const projectPath = pathManager.findProjectRoot() ?? process.cwd();
    const meta = stateManager.getMeta();

    const apiNames = Object.entries(meta?.api || {})
      .filter(([_, apiResource]) => (apiResource as any).service === 'AppSync')
      .map(([name]) => name);

    if (apiNames.length !== 1) {
      await setNotificationFlag(projectPath, 'securityEnhancementNotification', false);
      return;
    }

    const apiName = apiNames[0];

    const apiResourceDir = pathManager.getResourceDirectoryPath(projectPath, 'api', apiName);

    if (!fs.existsSync(apiResourceDir)) {
      await setNotificationFlag(projectPath, 'securityEnhancementNotification', false);
      return;
    }

    const project = await readProjectConfiguration(apiResourceDir);

    const directiveMap = collectDirectivesByTypeNames(project.schema);
    const notifyAuthWithKey = Object.keys(directiveMap.types).some(
      (type) => directiveMap.types[type].includes('auth') && directiveMap.types[type].includes('primaryKey'),
    );

    if (meta?.auth && notifyAuthWithKey) {
      printer.blankLine();
      const shouldContinue = await prompter.yesOrNo(
        "This version of Amplify CLI introduces additional security enhancements for your GraphQL API. @auth authorization rules applied on primary keys and indexes are scoped down further. The changes are applied automatically with this deployment. This change won't impact your client code. Continue",
      );

      if (!shouldContinue) {
        await context.usageData.emitSuccess();
        exitOnNextTick(0);
      }

      forceRefreshSchema();

      await setNotificationFlag(projectPath, 'securityEnhancementNotification', false);
    } else {
      await setNotificationFlag(projectPath, 'securityEnhancementNotification', false);
    }
  }
};

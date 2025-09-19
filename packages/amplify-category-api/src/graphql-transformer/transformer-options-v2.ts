import path from 'path';
import {
  $TSContext,
  $TSMeta,
  AmplifyCategories,
  AmplifySupportedService,
  CloudformationProviderFacade,
  getGraphQLTransformerAuthDocLink,
  JSONUtilities,
  pathManager,
  stateManager,
} from '@aws-amplify/amplify-cli-core';
import { AppSyncAuthConfiguration, TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { collectDirectivesByTypeNames } from '@aws-amplify/graphql-transformer-core';
import { getSanityCheckRules, loadProject } from 'graphql-transformer-core';
import fs from 'fs-extra';
import { ResourceConstants } from 'graphql-transformer-common';
import _ from 'lodash';
import { printer } from '@aws-amplify/amplify-prompts';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';
import { contextUtil } from '../category-utils/context-util';
import { shouldEnableNodeToNodeEncryption } from '../provider-utils/awscloudformation/current-backend-state/searchable-node-to-node-encryption';
import { schemaHasSandboxModeEnabled, showGlobalSandboxModeWarning, showSandboxModePrompts } from './sandbox-mode-helpers';
import { importTransformerModule } from './transformer-factory';
import { AmplifyCLIFeatureFlagAdapter } from './amplify-cli-feature-flag-adapter';
import { DESTRUCTIVE_UPDATES_FLAG, PARAMETERS_FILENAME, PROVIDER_NAME, ROOT_APPSYNC_S3_KEY } from './constants';
import { TransformerProjectOptions } from './transformer-options-types';
import { searchablePushChecks } from './api-utils';
import { parseUserDefinedSlots } from './user-defined-slots';
import { applyFileBasedOverride } from './override';
import { OverrideConfig } from './cdk-compat/transform-manager';

export const APPSYNC_RESOURCE_SERVICE = 'AppSync';

const warnOnAuth = (map: Record<string, any>, docLink: string): void => {
  const unAuthModelTypes = Object.keys(map).filter((type) => !map[type].includes('auth') && map[type].includes('model'));
  if (unAuthModelTypes.length) {
    printer.info(
      `
⚠️  WARNING: Some types do not have authorization rules configured. That means all create, read, update, and delete operations are denied on these types:`,
      'yellow',
    );
    printer.info(unAuthModelTypes.map((type) => `\t - ${type}`).join('\n'), 'yellow');
    printer.info(`Learn more about "@auth" authorization rules here: ${docLink}`, 'yellow');
  }
};

/**
 * Use current context to generate the Transformer options for generating
 * a GraphQL Transformer V2 object
 * @param context The $TSContext from the Amplify CLI
 * @param options The any options config coming from the Amplify CLI
 */
export const generateTransformerOptions = async (context: $TSContext, options: any): Promise<TransformerProjectOptions> => {
  let resourceName: string;
  const backEndDir = pathManager.getBackendDirPath();
  const flags = context.parameters.options;
  if (flags['no-gql-override']) {
    return undefined;
  }

  let { parameters } = options;
  const { forceCompile } = options;

  // Compilation during the push step
  const { resourcesToBeCreated, resourcesToBeUpdated, allResources } = await context.amplify.getResourceStatus(AmplifyCategories.API);
  let resources = resourcesToBeCreated.concat(resourcesToBeUpdated);

  // When build folder is missing include the API
  // to be compiled without the backend/api/<api-name>/build
  // cloud formation push will fail even if there is no changes in the GraphQL API
  // https://github.com/aws-amplify/amplify-console/issues/10
  const resourceNeedCompile = allResources
    .filter((r) => !resources.includes(r))
    .filter((r) => {
      const buildDir = path.normalize(path.join(backEndDir, AmplifyCategories.API, r.resourceName, 'build'));
      return !fs.existsSync(buildDir);
    });
  resources = resources.concat(resourceNeedCompile);

  if (forceCompile) {
    resources = resources.concat(allResources);
  }
  resources = resources.filter((resource) => resource.service === APPSYNC_RESOURCE_SERVICE);

  const resourceDir = await contextUtil.getResourceDir(context, options);

  let previouslyDeployedBackendDir = options.cloudBackendDirectory;
  if (!previouslyDeployedBackendDir) {
    if (resources.length > 0) {
      const resource = resources[0];
      if (resource.providerPlugin !== PROVIDER_NAME) {
        return undefined;
      }
      const { category } = resource;
      resourceName = resource.resourceName;
      const cloudBackendRootDir = pathManager.getCurrentCloudBackendDirPath();
      /* eslint-disable */
      previouslyDeployedBackendDir = path.normalize(path.join(cloudBackendRootDir, category, resourceName));
      /* eslint-enable */
    }
  }

  const parametersFilePath = path.join(resourceDir, PARAMETERS_FILENAME);

  if (!parameters && fs.existsSync(parametersFilePath)) {
    try {
      parameters = JSONUtilities.readJson(parametersFilePath);

      // OpenSearch Instance type support for x.y.search types
      if (parameters[ResourceConstants.PARAMETERS.OpenSearchInstanceType]) {
        parameters[ResourceConstants.PARAMETERS.OpenSearchInstanceType] = parameters[
          ResourceConstants.PARAMETERS.OpenSearchInstanceType
        ].replace('.search', '.elasticsearch');
      }
    } catch (e) {
      parameters = {};
    }
  }

  let { authConfig }: { authConfig: AppSyncAuthConfiguration } = options;

  if (_.isEmpty(authConfig) && !_.isEmpty(resources)) {
    authConfig = await context.amplify.invokePluginMethod(
      context,
      AmplifyCategories.API,
      AmplifySupportedService.APPSYNC,
      'getAuthConfig',
      [context, resources[0].resourceName],
    );
    // handle case where auth project is not migrated , if Auth not migrated above function will return empty Object
    if (_.isEmpty(authConfig)) {
      //
      // If we don't have an authConfig from the caller, use it from the
      // already read resources[0], which is an AppSync API.
      //
      if (resources[0].output.securityType) {
        // Convert to multi-auth format if needed.
        authConfig = {
          defaultAuthentication: {
            authenticationType: resources[0].output.securityType,
          },
          additionalAuthenticationProviders: [],
        };
      } else {
        ({ authConfig } = resources[0].output);
      }
    }
  }

  // for the predictions directive get storage config
  const s3Resource = s3ResourceAlreadyExists();
  const storageConfig = s3Resource ? getBucketName(s3Resource) : undefined;

  let deploymentRootKey = await getPreviousDeploymentRootKey(previouslyDeployedBackendDir);
  if (!deploymentRootKey) {
    const deploymentSubKey = await CloudformationProviderFacade.hashDirectory(context, resourceDir);
    deploymentRootKey = `${ROOT_APPSYNC_S3_KEY}/${deploymentSubKey}`;
  }
  const projectBucket = options.dryRun ? 'fake-bucket' : getProjectBucket();
  const buildParameters = {
    ...parameters,
    S3DeploymentBucket: projectBucket,
    S3DeploymentRootKey: deploymentRootKey,
  };

  // The project configuration loaded here uses the Gen1 CLI DataSourceTypes and modelToDatasourceMap to hold model information. We'll
  // convert it to the supported ModelDataSourceStrategy types later.
  const project = await loadProject(resourceDir);

  const lastDeployedProjectConfig = fs.existsSync(previouslyDeployedBackendDir)
    ? await loadProject(previouslyDeployedBackendDir)
    : undefined;
  const docLink = getGraphQLTransformerAuthDocLink(2);
  const sandboxModeEnabled = schemaHasSandboxModeEnabled(project.schema, docLink);
  const directiveMap = collectDirectivesByTypeNames(project.schema);
  const hasApiKey =
    authConfig.defaultAuthentication.authenticationType === 'API_KEY' ||
    authConfig.additionalAuthenticationProviders.some((authProvider) => authProvider.authenticationType === 'API_KEY');
  const showSandboxModeMessage = sandboxModeEnabled && hasApiKey;

  await searchablePushChecks(context, directiveMap.types, parameters[ResourceConstants.PARAMETERS.AppSyncApiName]);

  if (sandboxModeEnabled && options.promptApiKeyCreation) {
    const apiKeyConfig = await showSandboxModePrompts(context);
    if (apiKeyConfig) authConfig.additionalAuthenticationProviders.push(apiKeyConfig);
  }

  if (showSandboxModeMessage) {
    showGlobalSandboxModeWarning(docLink);
  } else {
    warnOnAuth(directiveMap.types, docLink);
  }

  // construct sanityCheckRules
  const ff = new AmplifyCLIFeatureFlagAdapter();
  const isNewAppSyncAPI: boolean = resourcesToBeCreated.some((resource) => resource.service === 'AppSync');
  const allowDestructiveUpdates = context?.input?.options?.[DESTRUCTIVE_UPDATES_FLAG] || context?.input?.options?.force;
  const sanityCheckRules = getSanityCheckRules(isNewAppSyncAPI, ff, allowDestructiveUpdates);
  let resolverConfig = {};
  if (!_.isEmpty(resources)) {
    resolverConfig = await context.amplify.invokePluginMethod(
      context,
      AmplifyCategories.API,
      AmplifySupportedService.APPSYNC,
      'getResolverConfig',
      [context, resources[0].resourceName],
    );
  }

  /**
   * if Auth is not migrated , we need to fetch resolver Config from transformer.conf.json
   * since above function will return empty object
   */
  if (_.isEmpty(resolverConfig)) {
    resolverConfig = project.config.ResolverConfig;
  }

  const resourceDirParts = resourceDir.split(path.sep);
  const apiName = resourceDirParts[resourceDirParts.length - 1];

  const userDefinedSlots = {
    ...parseUserDefinedSlots(project.pipelineFunctions),
    ...parseUserDefinedSlots(project.resolvers),
  };

  const overrideConfig: OverrideConfig = {
    applyOverride: (scope: Construct) => applyFileBasedOverride(scope),
    ...options.overrideConfig,
  };

  return {
    ...options,
    resourceName,
    buildParameters,
    projectDirectory: resourceDir,
    transformersFactoryArgs: {
      storageConfig,
      customTransformers: await loadCustomTransformersV2(resourceDir),
    },
    rootStackFileName: 'cloudformation-template.json',
    currentCloudBackendDirectory: previouslyDeployedBackendDir,
    // Reminder that `project` has type `any`, and is not actually compatible with DataSourceStrategiesProvider. We will correct that later.
    projectConfig: project,
    lastDeployedProjectConfig,
    authConfig,
    sandboxModeEnabled,
    sanityCheckRules,
    resolverConfig,
    userDefinedSlots,
    overrideConfig,
    stacks: project.stacks,
    stackMapping: project.config.StackMapping,
    transformParameters: generateTransformParameters(apiName, parameters, project.config, sandboxModeEnabled),
  };
};

/**
 * Generate transform parameters from feature flags and other config sources.
 * @param apiName the api name (used for determining current nodeToNodeEncryption value)
 * @param parameters invocation params, bag of bits, used for determining suppressApiKeyGeneration state
 * @param projectConfig hydrated project config object, with additional metadata, bag of bits, determines if resolver deduping is disabled
 * @param sandboxModeEnabled whether or not to enable sandbox mode on the transformed project
 * @returns a single set of params to configure the transform behavior.
 */
const generateTransformParameters = (
  apiName: string,
  parameters: any,
  projectConfig: any,
  sandboxModeEnabled: boolean,
): TransformParameters => {
  const featureFlagProvider = new AmplifyCLIFeatureFlagAdapter();
  return {
    shouldDeepMergeDirectiveConfigDefaults: featureFlagProvider.getBoolean('shouldDeepMergeDirectiveConfigDefaults'),
    useSubUsernameForDefaultIdentityClaim: featureFlagProvider.getBoolean('useSubUsernameForDefaultIdentityClaim'),
    populateOwnerFieldForStaticGroupAuth: featureFlagProvider.getBoolean('populateOwnerFieldForStaticGroupAuth'),
    secondaryKeyAsGSI: featureFlagProvider.getBoolean('secondaryKeyAsGSI'),
    enableAutoIndexQueryNames: featureFlagProvider.getBoolean('enableAutoIndexQueryNames'),
    respectPrimaryKeyAttributesOnConnectionField: featureFlagProvider.getBoolean('respectPrimaryKeyAttributesOnConnectionField'),
    subscriptionsInheritPrimaryAuth: featureFlagProvider.getBoolean('subscriptionsInheritPrimaryAuth'),
    suppressApiKeyGeneration: suppressApiKeyGeneration(parameters),
    disableResolverDeduping: projectConfig.DisableResolverDeduping ?? false,
    enableSearchNodeToNodeEncryption: shouldEnableNodeToNodeEncryption(
      apiName,
      pathManager.findProjectRoot(),
      pathManager.getCurrentCloudBackendDirPath(),
    ),
    enableSearchEncryptionAtRest: true,
    sandboxModeEnabled,
    enableTransformerCfnOutputs: true,
    allowDestructiveGraphqlSchemaUpdates: false,
    replaceTableUponGsiUpdate: false,
    allowGen1Patterns: true,
    enableGen2Migration: featureFlagProvider.getBoolean('enableGen2Migration'),
  };
};

export const suppressApiKeyGeneration = (parameters: any): boolean => {
  if (!('CreateAPIKey' in parameters)) {
    return false;
  }
  return parameters.CreateAPIKey !== 1 && parameters.CreateAPIKey !== '1';
};

/**
 * Scan the project config for custom transformers, then attempt to load them from the various node paths which Amplify supports.
 * @param resourceDir the directory to search for transformer configuration.
 * @returns a list of custom plugins.
 */
export const loadCustomTransformersV2 = async (resourceDir: string): Promise<TransformerPluginProvider[]> => {
  const customTransformersConfig = await loadProject(resourceDir);
  const customTransformerList = customTransformersConfig?.config?.transformers;
  return (Array.isArray(customTransformerList) ? customTransformerList : [])
    .map(importTransformerModule)
    .map((imported) => {
      const CustomTransformer = imported.default;

      if (typeof CustomTransformer === 'function') {
        return new CustomTransformer();
      }
      if (typeof CustomTransformer === 'object') {
        // Todo: Use a shim to ensure that it adheres to TransformerProvider interface. For now throw error
        // return CustomTransformer;
        throw new Error("Custom Transformers' should implement TransformerProvider interface");
      }

      throw new Error("Custom Transformers' default export must be a function or an object");
    })
    .filter((customTransformer) => customTransformer);
};

const getBucketName = (s3ResourceName: string): { bucketName: string } => {
  const amplifyMeta = stateManager.getMeta();
  const stackName = amplifyMeta.providers.awscloudformation.StackName;
  const s3ResourcePath = pathManager.getResourceDirectoryPath(undefined, AmplifyCategories.STORAGE, s3ResourceName);
  const cliInputsPath = path.join(s3ResourcePath, 'cli-inputs.json');
  let bucketParameters: Record<string, any>;
  // get bucketParameters 1st from cli-inputs , if not present, then parameters.json
  if (fs.existsSync(cliInputsPath)) {
    bucketParameters = JSONUtilities.readJson(cliInputsPath);
  } else {
    bucketParameters = stateManager.getResourceParametersJson(undefined, AmplifyCategories.STORAGE, s3ResourceName);
  }
  const bucketName = stackName.startsWith('amplify-')
    ? `${bucketParameters.bucketName}\${hash}-\${env}`
    : `${bucketParameters.bucketName}${s3ResourceName}-\${env}`;
  return { bucketName };
};

const getPreviousDeploymentRootKey = async (previouslyDeployedBackendDir: string): Promise<string | undefined> => {
  // this is the function
  let parameters;
  try {
    const parametersPath = path.join(previouslyDeployedBackendDir, `build/${PARAMETERS_FILENAME}`);
    const parametersExists = fs.existsSync(parametersPath);
    if (parametersExists) {
      const parametersString = await fs.readFile(parametersPath);
      parameters = JSON.parse(parametersString.toString());
    }
    return parameters.S3DeploymentRootKey;
  } catch (err) {
    return undefined;
  }
};

const getProjectBucket = (): string => {
  const meta: $TSMeta = stateManager.getMeta(undefined, { throwIfNotExist: false });
  const projectBucket = meta?.providers ? meta.providers[PROVIDER_NAME].DeploymentBucketName : '';
  return projectBucket;
};

/**
 * Check if storage exists in the project if not return undefined
 */
const s3ResourceAlreadyExists = (): string | undefined => {
  try {
    let resourceName: string;
    const amplifyMeta: $TSMeta = stateManager.getMeta(undefined, { throwIfNotExist: false });
    if (amplifyMeta?.[AmplifyCategories.STORAGE]) {
      const categoryResources = amplifyMeta[AmplifyCategories.STORAGE];
      Object.keys(categoryResources).forEach((resource) => {
        if (categoryResources[resource].service === AmplifySupportedService.S3) {
          resourceName = resource;
        }
      });
    }
    return resourceName;
  } catch (error) {
    if (error.name === 'UndeterminedEnvironmentError') {
      return undefined;
    }
    throw error;
  }
};

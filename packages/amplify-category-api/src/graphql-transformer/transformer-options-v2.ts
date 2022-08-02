import {
  $TSAny,
  $TSContext, $TSMeta, $TSObject,
  AmplifyCategories,
  AmplifySupportedService, ApiCategoryFacade,
  CloudformationProviderFacade, getGraphQLTransformerAuthDocLink,
  JSONUtilities,
  pathManager,
  stateManager,
} from 'amplify-cli-core';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import {
  collectDirectivesByTypeNames,
} from '@aws-amplify/graphql-transformer-core';
import {
  getSanityCheckRules,
  loadProject,
} from 'graphql-transformer-core';
import path from 'path';
import fs from 'fs-extra';
import { ResourceConstants } from 'graphql-transformer-common';
import _ from 'lodash';
import { getAdminRoles, getIdentityPoolId } from './utils';
import { schemaHasSandboxModeEnabled, showSandboxModePrompts } from './sandbox-mode-helpers';
import { getTransformerFactory } from './transformer-factory';
import { AmplifyCLIFeatureFlagAdapter } from './amplify-cli-feature-flag-adapter';
import {
  DESTRUCTIVE_UPDATES_FLAG,
  PARAMETERS_FILENAME,
  PROVIDER_NAME,
  ROOT_APPSYNC_S3_KEY,
} from './constants';
import {
  TransformerFactoryArgs,
  TransformerProjectOptions,
} from './transformer-options-types';
import { contextUtil } from '../category-utils/context-util';

export const APPSYNC_RESOURCE_SERVICE = 'AppSync';

/**
 * Use current context to generate the Transformer options for generating
 * a GraphQL Transformer V2 object
 * @param context The $TSContext from the Amplify CLI
 * @param options The $TSAny options config coming from the Amplify CLI
 */
export const generateTransformerOptions = async (
  context: $TSContext,
  options: $TSAny,
): Promise<TransformerProjectOptions<TransformerFactoryArgs>> => {
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
        parameters[ResourceConstants.PARAMETERS.OpenSearchInstanceType] = parameters[ResourceConstants.PARAMETERS.OpenSearchInstanceType]
          .replace('.search', '.elasticsearch');
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

  // for auth transformer we get any admin roles and a cognito identity pool to check for
  // potential authenticated roles outside of the provided authRole
  const adminRoles = await getAdminRoles(context, resourceName);
  const identityPoolId = await getIdentityPoolId(context);

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

  const project = await loadProject(resourceDir);

  const lastDeployedProjectConfig = fs.existsSync(previouslyDeployedBackendDir)
    ? await loadProject(previouslyDeployedBackendDir)
    : undefined;
  const transformerVersion = await ApiCategoryFacade.getTransformerVersion(context);
  const docLink = getGraphQLTransformerAuthDocLink(transformerVersion);
  const sandboxModeEnabled = schemaHasSandboxModeEnabled(project.schema, docLink);
  const directiveMap = collectDirectivesByTypeNames(project.schema);

  const transformerListFactory = await getTransformerFactory(context, resourceDir);

  if (sandboxModeEnabled && options.promptApiKeyCreation) {
    const apiKeyConfig = await showSandboxModePrompts(context);
    if (apiKeyConfig) authConfig.additionalAuthenticationProviders.push(apiKeyConfig);
  }

  let searchableTransformerFlag = false;

  if (directiveMap.directives.includes('searchable')) {
    searchableTransformerFlag = true;
  }

  // construct sanityCheckRules
  const ff = new AmplifyCLIFeatureFlagAdapter();
  const isNewAppSyncAPI: boolean = resourcesToBeCreated.some(resource => resource.service === 'AppSync');
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

  const buildConfig: TransformerProjectOptions<TransformerFactoryArgs> = {
    ...options,
    buildParameters,
    projectDirectory: resourceDir,
    transformersFactory: transformerListFactory,
    transformersFactoryArgs: {
      addSearchableTransformer: searchableTransformerFlag,
      storageConfig,
      authConfig,
      adminRoles,
      identityPoolId,
    },
    rootStackFileName: 'cloudformation-template.json',
    currentCloudBackendDirectory: previouslyDeployedBackendDir,
    minify: options.minify,
    projectConfig: project,
    lastDeployedProjectConfig,
    authConfig,
    sandboxModeEnabled,
    sanityCheckRules,
    resolverConfig,
  };

  return buildConfig;
};

const getBucketName = (s3ResourceName: string): { bucketName: string } => {
  const amplifyMeta = stateManager.getMeta();
  const stackName = amplifyMeta.providers.awscloudformation.StackName;
  const s3ResourcePath = pathManager.getResourceDirectoryPath(undefined, AmplifyCategories.STORAGE, s3ResourceName);
  const cliInputsPath = path.join(s3ResourcePath, 'cli-inputs.json');
  let bucketParameters: $TSObject;
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

const getPreviousDeploymentRootKey = async (previouslyDeployedBackendDir: string): Promise<string|undefined> => {
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
      Object.keys(categoryResources).forEach(resource => {
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

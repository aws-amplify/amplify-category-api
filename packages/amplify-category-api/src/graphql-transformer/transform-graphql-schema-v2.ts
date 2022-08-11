import {
  collectDirectivesByTypeNames,
  DeploymentResources,
  GraphQLTransform,
} from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import {
  $TSContext,
  $TSObject,
  AmplifyCategories,
  AmplifySupportedService,
  ApiCategoryFacade,
  getGraphQLTransformerAuthDocLink,
  JSONUtilities,
  pathManager,
} from 'amplify-cli-core';
import { printer } from 'amplify-prompts';
import fs from 'fs-extra';
import { ResourceConstants } from 'graphql-transformer-common';
import {
  loadProject,
  sanityCheckProject,
} from 'graphql-transformer-core';
import _ from 'lodash';
import path from 'path';
/* eslint-disable-next-line import/no-cycle */
import { searchablePushChecks } from './api-utils';
import { AmplifyCLIFeatureFlagAdapter } from './amplify-cli-feature-flag-adapter';
import { isAuthModeUpdated } from './auth-mode-compare';
import {
  schemaHasSandboxModeEnabled,
  showGlobalSandboxModeWarning,
  showSandboxModePrompts,
} from './sandbox-mode-helpers';
import { parseUserDefinedSlots } from './user-defined-slots';
import {
  mergeUserConfigWithTransformOutput,
  writeDeploymentToDisk,
} from './utils';
import {
  generateTransformerOptions,
} from './transformer-options-v2';
import {
  PARAMETERS_FILENAME,
  SCHEMA_DIR_NAME,
  SCHEMA_FILENAME,
} from './constants';
import {
  TransformerFactoryArgs,
  TransformerProjectOptions,
} from './transformer-options-types';
import { contextUtil } from '../category-utils/context-util';

const warnOnAuth = (map: $TSObject, docLink: string): void => {
  const unAuthModelTypes = Object.keys(map).filter(type => !map[type].includes('auth') && map[type].includes('model'));
  if (unAuthModelTypes.length) {
    printer.info(
      `
⚠️  WARNING: Some types do not have authorization rules configured. That means all create, read, update, and delete operations are denied on these types:`,
      'yellow',
    );
    printer.info(unAuthModelTypes.map(type => `\t - ${type}`).join('\n'), 'yellow');
    printer.info(`Learn more about "@auth" authorization rules here: ${docLink}`, 'yellow');
  }
};

/**
 * Transform GraphQL Schema
 */
export const transformGraphQLSchemaV2 = async (context: $TSContext, options): Promise<DeploymentResources | undefined> => {
  const backEndDir = pathManager.getBackendDirPath();
  const flags = context.parameters.options;
  if (flags['no-gql-override']) {
    return undefined;
  }

  let { parameters } = options;
  const { forceCompile } = options;
  const resourceDir = await contextUtil.getResourceDir(context, options);
  if (!resourceDir) {
    return undefined;
  }

  // Compilation during the push step
  const { resourcesToBeCreated, resourcesToBeUpdated, allResources } = await context.amplify.getResourceStatus(AmplifyCategories.API);
  let resources = resourcesToBeCreated.concat(resourcesToBeUpdated);

  // When build folder is missing include the API
  // to be compiled without the backend/api/<api-name>/build
  // cloud formation push will fail even if there is no changes in the GraphQL API
  // https://github.com/aws-amplify/amplify-console/issues/10
  const resourceNeedCompile = allResources
    .filter(r => !resources.includes(r))
    .filter(r => {
      const buildDir = path.normalize(path.join(backEndDir, AmplifyCategories.API, r.resourceName, 'build'));
      return !fs.existsSync(buildDir);
    });
  resources = resources.concat(resourceNeedCompile);

  if (forceCompile) {
    resources = resources.concat(allResources);
  }
  resources = resources.filter(resource => resource.service === 'AppSync');

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

  const buildDir = path.normalize(path.join(resourceDir, 'build'));
  const schemaFilePath = path.normalize(path.join(resourceDir, SCHEMA_FILENAME));
  const schemaDirPath = path.normalize(path.join(resourceDir, SCHEMA_DIR_NAME));

  // If it is a dry run, don't create the build folder as it could make a follow-up command
  // to not to trigger a build, hence a corrupt deployment.
  if (!options.dryRun) {
    fs.ensureDirSync(buildDir);
  }

  const project = await loadProject(resourceDir);

  const transformerVersion = await ApiCategoryFacade.getTransformerVersion(context);
  const docLink = getGraphQLTransformerAuthDocLink(transformerVersion);
  const sandboxModeEnabled = schemaHasSandboxModeEnabled(project.schema, docLink);
  const directiveMap = collectDirectivesByTypeNames(project.schema);
  const hasApiKey = authConfig.defaultAuthentication.authenticationType === 'API_KEY'
    || authConfig.additionalAuthenticationProviders.some(a => a.authenticationType === 'API_KEY');
  const showSandboxModeMessage = sandboxModeEnabled && hasApiKey;

  if (showSandboxModeMessage) {
    showGlobalSandboxModeWarning(docLink);
  } else {
    warnOnAuth(directiveMap.types, docLink);
  }

  searchablePushChecks(context, directiveMap.types, parameters[ResourceConstants.PARAMETERS.AppSyncApiName]);

  if (sandboxModeEnabled && options.promptApiKeyCreation) {
    const apiKeyConfig = await showSandboxModePrompts(context);
    if (apiKeyConfig) authConfig.additionalAuthenticationProviders.push(apiKeyConfig);
  }

  const buildConfig = await generateTransformerOptions(context, options);
  if (!buildConfig) {
    return undefined;
  }

  const transformerOutput = await buildAPIProject(context, buildConfig);

  printer.success(`GraphQL schema compiled successfully.\n\nEdit your schema at ${schemaFilePath} or \
place .graphql files in a directory at ${schemaDirPath}`);

  if (isAuthModeUpdated(options)) {
    parameters.AuthModeLastUpdated = new Date();
  }
  if (!options.dryRun) {
    JSONUtilities.writeJson(parametersFilePath, parameters);
  }

  return transformerOutput;
};

/**
 * buildAPIProject
 */
const buildAPIProject = async (
  context: $TSContext,
  opts: TransformerProjectOptions<TransformerFactoryArgs>,
): Promise<DeploymentResources|undefined> => {
  const schema = opts.projectConfig.schema.toString();
  // Skip building the project if the schema is blank
  if (!schema) {
    return undefined;
  }

  const builtProject = await _buildProject(opts);

  const buildLocation = path.join(opts.projectDirectory, 'build');
  const currentCloudLocation = opts.currentCloudBackendDirectory ? path.join(opts.currentCloudBackendDirectory, 'build') : undefined;

  if (opts.projectDirectory && !opts.dryRun) {
    await writeDeploymentToDisk(context, builtProject, buildLocation, opts.rootStackFileName, opts.buildParameters, opts.minify);
    await sanityCheckProject(
      currentCloudLocation,
      buildLocation,
      opts.rootStackFileName,
      opts.sanityCheckRules.diffRules,
      opts.sanityCheckRules.projectRules,
    );
  }

  // TODO: update local env on api compile
  // await _updateCurrentMeta(opts);

  return builtProject;
};

const _buildProject = async (opts: TransformerProjectOptions<TransformerFactoryArgs>): Promise<DeploymentResources> => {
  const userProjectConfig = opts.projectConfig;
  const stackMapping = userProjectConfig.config.StackMapping;
  const userDefinedSlots = {
    ...parseUserDefinedSlots(userProjectConfig.pipelineFunctions),
    ...parseUserDefinedSlots(userProjectConfig.resolvers),
  };

  // Create the transformer instances, we've to make sure we're not reusing them within the same CLI command
  // because the StackMapping feature already builds the project once.
  const transformers = await opts.transformersFactory(opts.transformersFactoryArgs);
  const transform = new GraphQLTransform({
    transformers,
    stackMapping,
    transformConfig: userProjectConfig.config,
    authConfig: opts.authConfig,
    buildParameters: opts.buildParameters,
    stacks: opts.projectConfig.stacks || {},
    featureFlags: new AmplifyCLIFeatureFlagAdapter(),
    sandboxModeEnabled: opts.sandboxModeEnabled,
    userDefinedSlots,
    resolverConfig: opts.resolverConfig,
    overrideConfig: opts.overrideConfig,
  });

  const schema = userProjectConfig.schema.toString();
  const transformOutput = transform.transform(schema);

  return mergeUserConfigWithTransformOutput(userProjectConfig, transformOutput, opts);
};

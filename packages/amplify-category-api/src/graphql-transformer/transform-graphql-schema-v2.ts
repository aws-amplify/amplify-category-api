/* eslint-disable no-underscore-dangle */
import path from 'path';
import { RDSConnectionSecrets, MYSQL_DB_TYPE, NestedStackProvider, FileAssetProvider, FileAsset, TemplateProps } from '@aws-amplify/graphql-transformer-core';
import {
  AppSyncAuthConfiguration,
  DeploymentResources,
  TransformerLog,
  TransformerLogLevel,
} from '@aws-amplify/graphql-transformer-interfaces';
import { $TSContext, AmplifyCategories, AmplifySupportedService, JSONUtilities, Template, pathManager } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import fs from 'fs-extra';
import { ResourceConstants } from 'graphql-transformer-common';
import { sanityCheckProject } from 'graphql-transformer-core';
import _ from 'lodash';
import { getExistingConnectionSecretNames, getSecretsKey } from '../provider-utils/awscloudformation/utils/rds-secrets/database-secrets';
import { getAppSyncAPIName } from '../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { isAuthModeUpdated } from './auth-mode-compare';
import { mergeUserConfigWithTransformOutput, writeDeploymentToDisk } from './utils';
import { generateTransformerOptions } from './transformer-options-v2';
import { TransformerProjectOptions } from './transformer-options-types';
import { executeTransform } from '@aws-amplify/graphql-transformer';
import { App, Stack } from 'aws-cdk-lib';
import { TransformerNestedStack, TransformerRootStack, TransformerStackSythesizer } from './cdk-compat';
import { Construct } from 'constructs';
import { AmplifyFileAsset } from './cdk-compat/file-asset';

const PARAMETERS_FILENAME = 'parameters.json';
const SCHEMA_FILENAME = 'schema.graphql';
const SCHEMA_DIR_NAME = 'schema';
const PROVIDER_NAME = 'awscloudformation';

/**
 * Transform GraphQL Schema
 */
export const transformGraphQLSchemaV2 = async (context: $TSContext, options): Promise<DeploymentResources | undefined> => {
  let resourceName: string;
  const backEndDir = pathManager.getBackendDirPath();
  const flags = context.parameters.options;
  if (flags['no-gql-override']) {
    return undefined;
  }

  let { resourceDir, parameters } = options;
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
  resources = resources.filter((resource) => resource.service === 'AppSync');

  if (!resourceDir) {
    // There can only be one appsync resource
    if (resources.length > 0) {
      const resource = resources[0];
      if (resource.providerPlugin !== PROVIDER_NAME) {
        return undefined;
      }
      const { category } = resource;
      ({ resourceName } = resource);
      resourceDir = path.normalize(path.join(backEndDir, category, resourceName));
    } else {
      // No appsync resource to update/add
      return undefined;
    }
  }

  const previouslyDeployedBackendDir = options.cloudBackendDirectory;
  if (!previouslyDeployedBackendDir) {
    if (resources.length > 0) {
      const resource = resources[0];
      if (resource.providerPlugin !== PROVIDER_NAME) {
        return undefined;
      }
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

  const buildDir = path.normalize(path.join(resourceDir, 'build'));
  const schemaFilePath = path.normalize(path.join(resourceDir, SCHEMA_FILENAME));
  const schemaDirPath = path.normalize(path.join(resourceDir, SCHEMA_DIR_NAME));

  // If it is a dry run, don't create the build folder as it could make a follow-up command
  // to not to trigger a build, hence a corrupt deployment.
  if (!options.dryRun) {
    fs.ensureDirSync(buildDir);
  }

  const buildConfig: TransformerProjectOptions = await generateTransformerOptions(context, options);
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
const buildAPIProject = async (context: $TSContext, opts: TransformerProjectOptions): Promise<DeploymentResources | undefined> => {
  const schema = opts.projectConfig.schema.toString();
  // Skip building the project if the schema is blank
  if (!schema) {
    return undefined;
  }

  const rootStackName = 'transformer-root-stack';

  const app = new App();
  const stackSynthesizer = new TransformerStackSythesizer();
  const rootStack = new TransformerRootStack(app, rootStackName, {
    synthesizer: stackSynthesizer,
  });
  const childStackSynthesizers = new Map<string, TransformerStackSythesizer>();

  const nestedStackProvider: NestedStackProvider = {
    generateNestedStack: (scope: Construct, stackName: string): Stack => {
      const synthesizer = new TransformerStackSythesizer();
      const newStack = new TransformerNestedStack(scope, stackName, { synthesizer });
      childStackSynthesizers.set(stackName, synthesizer);
      return newStack;
    },
  };

  const fileAssetProvider: FileAssetProvider = {
    generateAsset: (scope: Construct, id: string, props: TemplateProps): FileAsset => {
      return new AmplifyFileAsset(scope, id, props);
    },
  };

  const getCloudFormationTemplates = (): Map<string, Template> => {
    let stacks = stackSynthesizer.collectStacks();
    childStackSynthesizers.forEach((synthesizer) => {
      stacks = new Map([...stacks.entries(), ...synthesizer.collectStacks()]);
    });
    return stacks;
  };
  
  const getMappingTemplates = (): Map<string, string> => {
    return stackSynthesizer.collectMappingTemplates();
  };

  const getDeploymentResources = (): DeploymentResources => {
    const cloudformationTemplates = getCloudFormationTemplates();
    const _rootStack = cloudformationTemplates.get(rootStackName);
    const stacks: Record<string, Template> = {};
    for (const [templateName, template] of cloudformationTemplates.entries()) {
      if (templateName !== rootStackName) {
        stacks[templateName] = template;
      }
    }
    const fileAssets = getMappingTemplates();
    const _schema =  fileAssets.get('schema.graphql');
    const resolvers: Record<string, string> = {};
    const pipelineFunctions: Record<string, string> = {};
    const functions: Record<string, string> = {};
    for (const [templateName, template] of fileAssets) {
      if (templateName.startsWith('resolvers/')) {
        resolvers[templateName.replace('resolvers/', '')] = template;
      }
      if (templateName.startsWith('pipelineFunctions/')) {
        pipelineFunctions[templateName.replace('pipelineFunctions/', '')] = template;
      }
      if (templateName.startsWith('functions/')) {
        functions[templateName.replace('functions/', '')] = template;
      }
    }
    return {
      rootStack: _rootStack,
      stacks,
      schema: _schema,
      resolvers,
      pipelineFunctions,
      functions,
      stackMapping: {},
      userOverriddenSlots: [],
    };
  };

  executeTransform({
    scope: rootStack,
    fileAssetProvider,
    nestedStackProvider,
    ...opts,
    schema,
    modelToDatasourceMap: opts.projectConfig.modelToDatasourceMap,
    datasourceSecretParameterLocations: await getDatasourceSecretMap(context),
    printTransformerLog,
  });

  if (opts.overrideConfig?.overrideFlag) {
    opts.overrideConfig?.applyOverride(app);
  }

  app.synth({ force: true, skipValidation: true });

  const deploymentResources = getDeploymentResources();

  const builtProject = mergeUserConfigWithTransformOutput(opts.projectConfig, deploymentResources, opts);

  const buildLocation = path.join(opts.projectDirectory, 'build');
  const currentCloudLocation = opts.currentCloudBackendDirectory ? path.join(opts.currentCloudBackendDirectory, 'build') : undefined;

  if (opts.projectDirectory && !opts.dryRun) {
    await writeDeploymentToDisk(context, builtProject, buildLocation, opts.rootStackFileName, opts.buildParameters);
    await sanityCheckProject(
      currentCloudLocation,
      buildLocation,
      opts.rootStackFileName,
      opts.sanityCheckRules.diffRules,
      opts.sanityCheckRules.projectRules,
    );
  }

  return builtProject;
};

const getDatasourceSecretMap = async (context: $TSContext): Promise<Map<string, RDSConnectionSecrets>> => {
  const outputMap = new Map<string, RDSConnectionSecrets>();
  const apiName = getAppSyncAPIName();
  const secretsKey = await getSecretsKey();
  const rdsSecretPaths = await getExistingConnectionSecretNames(context, apiName, secretsKey);
  if (rdsSecretPaths) {
    outputMap.set(MYSQL_DB_TYPE, rdsSecretPaths);
  }
  return outputMap;
};

const printTransformerLog = (log: TransformerLog): void => {
  switch (log.level) {
    case TransformerLogLevel.ERROR:
      printer.error(log.message);
      break;
    case TransformerLogLevel.WARN:
      printer.warn(log.message);
      break;
    case TransformerLogLevel.INFO:
      printer.info(log.message);
      break;
    case TransformerLogLevel.DEBUG:
      printer.debug(log.message);
      break;
    default:
      printer.error(log.message);
  }
};

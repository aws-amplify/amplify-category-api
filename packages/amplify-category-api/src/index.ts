import * as path from 'path';
import {
  $TSContext,
  AmplifyCategories,
  AmplifyError,
  AmplifySupportedService,
  buildOverrideDir,
  pathManager,
  stateManager,
} from '@aws-amplify/amplify-cli-core';
import { ensureEnvParamManager } from '@aws-amplify/amplify-environment-parameters';
import { printer } from '@aws-amplify/amplify-prompts';
import { validateAddApiRequest, validateUpdateApiRequest } from 'amplify-util-headless-input';
import * as fs from 'fs-extra';
import { SQL_SCHEMA_FILE_NAME, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import _ from 'lodash';
import { run } from './commands/api/console';
import {
  getAppSyncAuthConfig,
  getAppSyncResourceName,
  getAPIResourceDir,
} from './provider-utils/awscloudformation/utils/amplify-meta-utils';
import { provider } from './provider-utils/awscloudformation/aws-constants';
import { ApigwStackTransform } from './provider-utils/awscloudformation/cdk-stack-builder';
import { getCfnApiArtifactHandler } from './provider-utils/awscloudformation/cfn-api-artifact-handler';
import { askAuthQuestions } from './provider-utils/awscloudformation/service-walkthroughs/appSync-walkthrough';
import { authConfigToAppSyncAuthType } from './provider-utils/awscloudformation/utils/auth-config-to-app-sync-auth-type-bi-di-mapper';
import { checkAppsyncApiResourceMigration } from './provider-utils/awscloudformation/utils/check-appsync-api-migration';
import { getAppSyncApiResourceName } from './provider-utils/awscloudformation/utils/getAppSyncApiName';
import { configureMultiEnvDBSecrets } from './provider-utils/awscloudformation/utils/rds-resources/multi-env-database-secrets';
import {
  deleteConnectionSecrets,
  getSecretsKey,
  getDatabaseName,
  removeVpcSchemaInspectorLambda,
} from './provider-utils/awscloudformation/utils/rds-resources/database-resources';
import { AmplifyGraphQLTransformerErrorConverter } from './errors/amplify-error-converter';

export { NETWORK_STACK_LOGICAL_ID } from './category-constants';
export { addAdminQueriesApi, updateAdminQueriesApi } from './provider-utils/awscloudformation';
export { DEPLOYMENT_MECHANISM } from './provider-utils/awscloudformation/base-api-stack';
// eslint-disable-next-line spellcheck/spell-checker
export { convertDeperecatedRestApiPaths } from './provider-utils/awscloudformation/convert-deprecated-apigw-paths';
export { getContainers } from './provider-utils/awscloudformation/docker-compose';
export { EcsAlbStack } from './provider-utils/awscloudformation/ecs-alb-stack';
export { EcsStack } from './provider-utils/awscloudformation/ecs-apigw-stack';
export { promptToAddApiKey } from './provider-utils/awscloudformation/prompt-to-add-api-key';
export {
  ApiResource,
  generateContainersArtifacts,
  processDockerConfig,
} from './provider-utils/awscloudformation/utils/containers-artifacts';
export { getAuthConfig } from './provider-utils/awscloudformation/utils/get-appsync-auth-config';
export { getResolverConfig } from './provider-utils/awscloudformation/utils/get-appsync-resolver-config';
export { getGitHubOwnerRepoFromPath } from './provider-utils/awscloudformation/utils/github';
export * from './graphql-transformer';
export * from './force-updates';
export { showApiAuthAcm } from './category-utils/show-auth-acm';
export { isDataStoreEnabled } from './category-utils/is-datastore-enabled';

const category = AmplifyCategories.API;

/**
 * Open the AppSync/API Gateway AWS console
 */
export const console = async (context: $TSContext): Promise<void> => {
  await run(context);
};

/**
 * Migrate from original API config
 */
export const migrate = async (context: $TSContext, serviceName?: string): Promise<void> => {
  const { projectPath } = context?.migrationInfo ?? { projectPath: pathManager.findProjectRoot() };
  const amplifyMeta = stateManager.getMeta(projectPath);
  const migrateResourcePromises = [];
  for (const categoryName of Object.keys(amplifyMeta)) {
    if (categoryName !== category) {
      // eslint-disable-next-line no-continue
      continue;
    }
    for (const resourceName of Object.keys(amplifyMeta[category])) {
      try {
        if (amplifyMeta[category][resourceName].providerPlugin) {
          const providerController = await import(
            path.join(__dirname, 'provider-utils', amplifyMeta[category][resourceName].providerPlugin, 'index')
          );
          // eslint-disable-next-line max-depth
          if (!providerController) {
            // eslint-disable-next-line no-continue
            continue;
          }
          // eslint-disable-next-line max-depth
          if (!serviceName || serviceName === amplifyMeta[category][resourceName].service) {
            migrateResourcePromises.push(
              providerController.migrateResource(context, projectPath, amplifyMeta[category][resourceName].service, resourceName),
            );
          }
        } else {
          printer.error(`Provider not configured for ${category}: ${resourceName}`);
        }
      } catch (e) {
        printer.warn(`Could not run migration for ${category}: ${resourceName}`);
        throw e;
      }
    }
  }
  for (const migrateResourcePromise of migrateResourcePromises) {
    await migrateResourcePromise;
  }
};

/**
 * Setup new environment with rds datasource
 */
export const initEnv = async (context: $TSContext): Promise<void> => {
  const datasource = 'Aurora Serverless';
  const service = 'service';
  const rdsInit = 'rdsInit';

  const { amplify } = context;
  const { envName } = amplify.getEnvInfo();

  /**
   * Check if we need to do the walkthrough, by looking to see if previous environments have
   * configured an RDS datasource
   */
  const backendConfigFilePath = pathManager.getBackendConfigFilePath();

  // If this is a mobile hub migrated project without locally added resources then there is no
  // backend config exists yet.
  if (!fs.existsSync(backendConfigFilePath)) {
    return;
  }

  const backendConfig = stateManager.getBackendConfig();

  if (!backendConfig[category]) {
    return;
  }

  let resourceName;
  const apis = Object.keys(backendConfig[category]);
  for (const api of apis) {
    if (backendConfig[category][api][service] === AmplifySupportedService.APPSYNC) {
      resourceName = api;
      break;
    }
  }

  // If an AppSync API does not exist, no need to prompt for rds datasource
  if (!resourceName) {
    return;
  }

  // proceed if there are any existing imported Relational Data Sources
  const apiResourceDir = getAPIResourceDir(resourceName);
  const pathToSchemaFile = path.join(apiResourceDir, SQL_SCHEMA_FILE_NAME);
  if (fs.existsSync(pathToSchemaFile)) {
    // read and validate the RDS connection parameters
    const secretsKey = await getSecretsKey();

    const envInfo = {
      isNewEnv: context.exeInfo?.isNewEnv,
      sourceEnv: context.exeInfo?.sourceEnvName,
      yesFlagSet: _.get(context, ['parameters', 'options', 'yes'], false),
      envName: envName,
    };
    await configureMultiEnvDBSecrets(context, secretsKey, resourceName, envInfo);
  }

  // If an AppSync API has not been initialized with RDS, no need to prompt
  if (!backendConfig[category][resourceName][rdsInit]) {
    return;
  }

  const providerController = await import(path.join(__dirname, 'provider-utils', provider, 'index'));

  if (!providerController) {
    printer.error('Provider not configured for this category');
    return;
  }

  /**
   * Check environment parameter manager to ensure it hasn't already been created for current env
   */
  const envParamManager = (await ensureEnvParamManager()).instance;
  if (
    envParamManager.hasResourceParamManager(category, resourceName) &&
    envParamManager.getResourceParamManager(category, resourceName).getParam('rdsRegion')
  ) {
    return;
  }
  // execute the walkthrough
  await providerController
    .addDatasource(context, category, datasource)
    .then((answers) => {
      /**
       * Update environment parameter manager with answers
       */
      envParamManager.getResourceParamManager(category, resourceName).setParams({
        rdsRegion: answers.region,
        rdsClusterIdentifier: answers.dbClusterArn,
        rdsSecretStoreArn: answers.secretStoreArn,
        rdsDatabaseName: answers.databaseName,
      });
    })
    .then(async () => {
      await context.amplify.executeProviderUtils(context, 'awscloudformation', 'compileSchema', { forceCompile: true });
    });
};

/**
 * Get permissions for depending on this resource
 */
export const getPermissionPolicies = async (
  context: $TSContext,
  resourceOpsMapping: Record<string, any>,
): Promise<{ permissionPolicies: any[]; resourceAttributes: any[] }> => {
  const amplifyMeta = stateManager.getMeta();
  const permissionPolicies = [];
  const resourceAttributes = [];

  await Promise.all(
    Object.keys(resourceOpsMapping).map(async (resourceName) => {
      try {
        const providerName = amplifyMeta[category][resourceName].providerPlugin;
        if (providerName) {
          const providerController = await import(path.join(__dirname, 'provider-utils', providerName, 'index'));
          const { policy, attributes } = await providerController.getPermissionPolicies(
            context,
            amplifyMeta[category][resourceName].service,
            resourceName,
            resourceOpsMapping[resourceName],
          );
          permissionPolicies.push(policy);
          resourceAttributes.push({ resourceName, attributes, category });
        } else {
          printer.error(`Provider not configured for ${category}: ${resourceName}`);
        }
      } catch (e) {
        printer.warn(`Could not get policies for ${category}: ${resourceName}`);
        throw e;
      }
    }),
  );
  return { permissionPolicies, resourceAttributes };
};

/**
 * Main entry point for executing an api subcommand
 */
export const executeAmplifyCommand = async (context: $TSContext): Promise<void> => {
  let commandPath = path.normalize(path.join(__dirname, 'commands'));
  if (context.input.command === 'help') {
    commandPath = path.join(commandPath, category);
  } else {
    commandPath = path.join(commandPath, category, context.input.command);
  }

  // TODO: This is a temporary suppression for CDK deprecation warnings, which should be removed after the migration is complete
  // Most of these warning messages are targetting searchable directive, which needs to migrate from elastic search to open search
  // This is not diabled in debug mode
  disableCDKDeprecationWarning();

  const commandModule = await import(commandPath);
  try {
    await commandModule.run(context);
  } catch (error) {
    if (error) {
      printer.error(error.message || error);
      if (error.stack) {
        printer.debug(error.stack);
      }
      await context.usageData.emitError(error);
    }
    process.exitCode = 1;
  }
};

/**
 * Main entry point for executing a headless api command
 */
export const executeAmplifyHeadlessCommand = async (context: $TSContext, headlessPayload: string): Promise<void> => {
  context.usageData.pushHeadlessFlow(headlessPayload, context.input);
  switch (context.input.command) {
    case 'add':
      await getCfnApiArtifactHandler(context).createArtifacts(await validateAddApiRequest(headlessPayload));
      break;
    case 'update': {
      const resourceName = await getAppSyncApiResourceName(context);
      await checkAppsyncApiResourceMigration(context, resourceName, true);
      await getCfnApiArtifactHandler(context).updateArtifacts(await validateUpdateApiRequest(headlessPayload));
      break;
    }
    default:
      printer.error(`Headless mode for ${context.input.command} api is not implemented yet`);
  }
};

/**
 * Handle state changes in Amplify app.
 */
export const handleAmplifyEvent = async (context: $TSContext, args: any): Promise<void> => {
  switch (args.event) {
    case 'InternalOnlyPostEnvRemove': {
      const meta = stateManager.getMeta();
      const apiName = getAppSyncResourceName(meta);
      if (!apiName) {
        return;
      }
      await deleteConnectionSecrets(context, apiName, args?.data?.envName);
      await removeVpcSchemaInspectorLambda(context);
      break;
    }
    default:
    // other event handlers not implemented
  }
};

/**
 * Add a new auth mode to the API
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const addGraphQLAuthorizationMode = async (context: $TSContext, args: Record<string, any>) => {
  const { authType, printLeadText, authSettings } = args;
  const meta = stateManager.getMeta();
  const apiName = getAppSyncResourceName(meta);
  if (!apiName) {
    return undefined;
  }

  const authConfig = getAppSyncAuthConfig(meta);
  const addAuthConfig = await askAuthQuestions(authType, context, printLeadText, authSettings);
  authConfig.additionalAuthenticationProviders.push(addAuthConfig);
  await context.amplify.updateamplifyMetaAfterResourceUpdate(category, apiName, 'output', { authConfig });
  await context.amplify.updateBackendConfigAfterResourceUpdate(category, apiName, 'output', { authConfig });

  await getCfnApiArtifactHandler(context).updateArtifacts(
    {
      version: 1,
      serviceModification: {
        serviceName: 'AppSync',
        additionalAuthTypes: authConfig.additionalAuthenticationProviders.map(authConfigToAppSyncAuthType),
      },
    },
    {
      skipCompile: false,
    },
  );

  return addAuthConfig;
};

/**
 * Synthesize the CFN template for the API
 */
export const transformCategoryStack = async (context: $TSContext, resource: Record<string, any>): Promise<void> => {
  if (resource.service === AmplifySupportedService.APPSYNC) {
    if (canResourceBeTransformed(resource.resourceName)) {
      const backendDir = pathManager.getBackendDirPath();
      const overrideDir = path.join(backendDir, resource.category, resource.resourceName);
      const isBuild = await buildOverrideDir(backendDir, overrideDir).catch((error) => {
        throw new AmplifyError(
          'InvalidOverrideError',
          {
            message: error.message,
            link: 'https://docs.amplify.aws/cli/graphql/override/',
          },
          error,
        );
      });
      try {
        await context.amplify.invokePluginMethod(context, 'awscloudformation', undefined, 'compileSchema', [
          context,
          {
            forceCompile: true,
            overrideConfig: {
              overrideFlag: isBuild,
              overrideDir,
              resourceName: resource.resourceName,
            },
          },
        ]);
      } catch (error) {
        throw AmplifyGraphQLTransformerErrorConverter.convert(error);
      }
    }
  } else if (resource.service === AmplifySupportedService.APIGW) {
    if (canResourceBeTransformed(resource.resourceName)) {
      // Rebuild CFN
      const apigwStack = new ApigwStackTransform(context, resource.resourceName);
      await apigwStack.transform();
    }
  }
};

const canResourceBeTransformed = (resourceName: string): boolean =>
  stateManager.resourceInputsJsonExists(undefined, AmplifyCategories.API, resourceName);

/**
 * Disable the CDK deprecation warning in production but not in CI/debug mode
 */
const disableCDKDeprecationWarning = () => {
  const isDebug = process.argv.includes('--debug') || process.env.AMPLIFY_ENABLE_DEBUG_OUTPUT === 'true';
  if (!isDebug) {
    process.env.JSII_DEPRECATED = 'quiet';
  }
};
// No-op change to trigger publish

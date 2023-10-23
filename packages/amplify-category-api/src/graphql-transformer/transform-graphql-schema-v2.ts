import path from 'path';
import {
  RDSConnectionSecrets,
  MYSQL_DB_TYPE,
  ImportedRDSType,
  DatasourceType,
  UserDefinedSlot,
} from '@aws-amplify/graphql-transformer-core';
import {
  AppSyncAuthConfiguration,
  TransformerLog,
  TransformerLogLevel,
  VpcConfig,
  RDSLayerMapping,
  SubnetAvailabilityZone,
} from '@aws-amplify/graphql-transformer-interfaces';
import * as fs from 'fs-extra';
import { ResourceConstants } from 'graphql-transformer-common';
import { sanityCheckProject } from 'graphql-transformer-core';
import _ from 'lodash';
import { executeTransform } from '@aws-amplify/graphql-transformer';
import { $TSContext, AmplifyCategories, AmplifySupportedService, JSONUtilities, pathManager } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { getHostVpc } from '@aws-amplify/graphql-schema-generator';
import fetch from 'node-fetch';
import {
  getConnectionSecrets,
  testDatabaseConnection,
  getExistingConnectionSecretNames,
  getSecretsKey,
} from '../provider-utils/awscloudformation/utils/rds-resources/database-resources';
import { getAppSyncAPIName } from '../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { isAuthModeUpdated } from './auth-mode-compare';
import { getAdminRoles, getIdentityPoolId, mergeUserConfigWithTransformOutput, writeDeploymentToDisk } from './utils';
import { generateTransformerOptions } from './transformer-options-v2';
import { TransformerProjectOptions } from './transformer-options-types';
import { DeploymentResources } from './cdk-compat/deployment-resources';
import { TransformManager } from './cdk-compat/transform-manager';
import { checkForUnsupportedDirectives } from '../provider-utils/awscloudformation/utils/rds-resources/utils';
import { getAvaliabilityZoneOfSubnets } from '../provider-utils/vpc-utils';

const PARAMETERS_FILENAME = 'parameters.json';
const SCHEMA_FILENAME = 'schema.graphql';
const SCHEMA_DIR_NAME = 'schema';
const PROVIDER_NAME = 'awscloudformation';
const LAYER_MAPPING_URL = 'https://amplify-rds-layer-resources.s3.amazonaws.com/rds-layer-mapping.json';

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
      return !fs.pathExistsSync(buildDir);
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

  if (!parameters && fs.pathExistsSync(parametersFilePath)) {
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

const getAuthenticationTypesForAuthConfig = (authConfig?: AppSyncAuthConfiguration): (string | undefined)[] =>
  [authConfig?.defaultAuthentication, ...(authConfig?.additionalAuthenticationProviders ?? [])].map(
    (authConfigEntry) => authConfigEntry?.authenticationType,
  );

const hasIamAuth = (authConfig?: AppSyncAuthConfiguration): boolean =>
  getAuthenticationTypesForAuthConfig(authConfig).some((authType) => authType === 'AWS_IAM');

const hasUserPoolAuth = (authConfig?: AppSyncAuthConfiguration): boolean =>
  getAuthenticationTypesForAuthConfig(authConfig).some((authType) => authType === 'AMAZON_COGNITO_USER_POOLS');

/**
 * buildAPIProject
 */
const buildAPIProject = async (context: $TSContext, opts: TransformerProjectOptions): Promise<DeploymentResources | undefined> => {
  const schema = opts.projectConfig.schema.toString();
  // Skip building the project if the schema is blank
  if (!schema) {
    return undefined;
  }

  checkForUnsupportedDirectives(schema, opts.projectConfig.modelToDatasourceMap);

  const { modelToDatasourceMap } = opts.projectConfig;
  const datasourceSecretMap = await getDatasourceSecretMap(context);
  const datasourceMapValues: Array<DatasourceType> = modelToDatasourceMap ? Array.from(modelToDatasourceMap.values()) : [];
  let sqlLambdaVpcConfig: VpcConfig | undefined;
  if (datasourceMapValues.some((value) => value.dbType === MYSQL_DB_TYPE && !value.provisionDB)) {
    sqlLambdaVpcConfig = await isSqlLambdaVpcConfigRequired(context);
  }
  const rdsLayerMapping = await getRDSLayerMapping();

  const transformManager = new TransformManager(
    opts.overrideConfig,
    hasIamAuth(opts.authConfig),
    hasUserPoolAuth(opts.authConfig),
    await getAdminRoles(context, opts.resourceName),
    await getIdentityPoolId(context),
  );

  executeTransform({
    ...opts,
    scope: transformManager.rootStack,
    nestedStackProvider: transformManager.getNestedStackProvider(),
    assetProvider: transformManager.getAssetProvider(),
    parameterProvider: transformManager.getParameterProvider(),
    synthParameters: transformManager.getSynthParameters(),
    schema,
    modelToDatasourceMap: opts.projectConfig.modelToDatasourceMap,
    customQueries: opts.projectConfig.customQueries,
    datasourceSecretParameterLocations: datasourceSecretMap,
    printTransformerLog,
    sqlLambdaVpcConfig,
    rdsLayerMapping,
  });

  const transformOutput: DeploymentResources = {
    ...transformManager.generateDeploymentResources(),
    userOverriddenSlots: opts.userDefinedSlots ? getUserOverridenSlots(opts.userDefinedSlots) : [],
  };

  const builtProject = mergeUserConfigWithTransformOutput(opts.projectConfig, transformOutput, opts);

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

export const getUserOverridenSlots = (userDefinedSlots: Record<string, UserDefinedSlot[]>): string[] =>
  Object.values(userDefinedSlots)
    .flat()
    .flatMap((slot) => [slot.requestResolver?.fileName, slot.responseResolver?.fileName])
    .flat()
    .filter((slotName) => slotName !== undefined);

const getRDSLayerMapping = async (): Promise<RDSLayerMapping> => {
  try {
    const response = await fetch(LAYER_MAPPING_URL);
    if (response.status === 200) {
      const result = await response.json();
      return result as RDSLayerMapping;
    }
  } catch (err) {
    // Ignore the error and return default layer mapping
  }
  printer.warn('Unable to load the latest RDS layer configuration, using local configuration.');
  return {};
};

const isSqlLambdaVpcConfigRequired = async (context: $TSContext): Promise<VpcConfig | undefined> => {
  // If the database is in VPC, we will use the same VPC configuration for the SQL lambda.
  // Customers are required to add inbound rule for port 443 from the private subnet in the Security Group.
  // https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html#vpc-requirements-and-limitations
  const vpcSubnetConfig = await getSQLLambdaVpcConfig(context);

  return vpcSubnetConfig;
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

const getSQLLambdaVpcConfig = async (context: $TSContext): Promise<VpcConfig> => {
  const [secretsKey, engine] = [getSecretsKey(), ImportedRDSType.MYSQL];
  const { secrets } = await getConnectionSecrets(context, secretsKey, engine);
  const region = context.amplify.getProjectMeta().providers.awscloudformation.Region;
  const vpcConfig = await getHostVpc(secrets.host, region);
  return vpcConfig;
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

import path from 'path';
import {
  constructSqlDirectiveDataSourceStrategies,
  DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  getDefaultStrategyNameForDbType,
  getImportedRDSTypeFromStrategyDbType,
  isDynamoDbType,
  isSqlDbType,
  UserDefinedSlot,
} from '@aws-amplify/graphql-transformer-core';
import {
  AppSyncAuthConfiguration,
  DataSourceStrategiesProvider,
  ModelDataSourceStrategy,
  ModelDataSourceStrategyDbType,
  ModelDataSourceStrategySqlDbType,
  RDSLayerMapping,
  RDSSNSTopicMapping,
  SQLLambdaModelDataSourceStrategy,
  SqlDirectiveDataSourceStrategy,
  SqlModelDataSourceDbConnectionConfig,
  TransformerLog,
  TransformerLogLevel,
  VpcConfig,
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
  getExistingConnectionDbConnectionConfig,
  getSecretsKey,
} from '../provider-utils/awscloudformation/utils/rds-resources/database-resources';
import { getAppSyncAPIName } from '../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { checkForUnsupportedDirectives, containsSqlModelOrDirective } from '../provider-utils/awscloudformation/utils/rds-resources/utils';
import { isAuthModeUpdated } from './auth-mode-compare';
import { getAdminRoles, getIdentityPoolId, mergeUserConfigWithTransformOutput, writeDeploymentToDisk } from './utils';
import { generateTransformerOptions } from './transformer-options-v2';
import { TransformerProjectOptions } from './transformer-options-types';
import { DeploymentResources } from './cdk-compat/deployment-resources';
import { TransformManager } from './cdk-compat/transform-manager';

const PARAMETERS_FILENAME = 'parameters.json';
const SCHEMA_FILENAME = 'schema.graphql';
const SCHEMA_DIR_NAME = 'schema';
const PROVIDER_NAME = 'awscloudformation';
const USE_BETA_SQL_LAYER = 'use-beta-sql-layer';

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

  // The buildConfig.projectConfig returned by `generateTransformerOptions` is not actually compatible with DataSourceStrategiesProvider. We
  // will correct that in buildAPIProject.
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
 * Given an array of DataSourceType shapes from the Gen1 CLI import flow, finds the single SQL database type. Throws an error if more than
 * one SQL database type is detected.
 */
const getSqlDbTypeFromDataSourceTypes = (
  dataSourceTypes: Array<{
    dbType: ModelDataSourceStrategyDbType;
    provisionDB: boolean;
    provisionStrategy: 'DEFAULT' | 'AMPLIFY_TABLE';
  }>,
): ModelDataSourceStrategySqlDbType | undefined => {
  const dbTypes = Object.values(dataSourceTypes)
    .map((dsType) => dsType.dbType)
    .filter(isSqlDbType);
  if (dbTypes.length === 0) {
    return undefined;
  }
  if (new Set(dbTypes).size > 1) {
    throw new Error(`Multiple imported SQL datasource types ${Array.from(dbTypes)} are detected. Only one type is supported.`);
  }
  return dbTypes[0];
};

/**
 * The `projectConfig` argument to `fixUpDataSourceStrategiesProvider` is a `ProjectConfiguration` from the Gen1 CLI import flow. That type
 * is not exported, and don't want to pollute the Gen2 / CDK compat interfaces with those legacy attributes, so instead we'll strongly type
 * the fields we're interested in operating on.
 */
interface Gen1ProjectConfiguration {
  schema: string;
  modelToDatasourceMap: Map<
    string,
    {
      dbType: ModelDataSourceStrategyDbType;
      provisionDB: boolean;
      provisionStrategy: 'DEFAULT' | 'AMPLIFY_TABLE';
    }
  >;
  customQueries: Map<string, string>;
}

/**
 * Utility to fix up the project config generated by the Gen1 CLI flow into the ModelDataSourceStrategy types expected by the transformer
 * internals. Internally, this function makes network calls to retrieve the database connection parameter info from SSM, and uses those
 * values to discover VPC configurations for the database.
 */
const fixUpDataSourceStrategiesProvider = async (
  context: $TSContext,
  projectConfig: Gen1ProjectConfiguration,
): Promise<DataSourceStrategiesProvider> => {
  const modelToDatasourceMap = projectConfig.modelToDatasourceMap ?? new Map();
  const datasourceMapValues: Array<{
    dbType: ModelDataSourceStrategyDbType;
    provisionDB: boolean;
    provisionStrategy: 'DEFAULT' | 'AMPLIFY_TABLE';
  }> = modelToDatasourceMap ? Array.from(modelToDatasourceMap.values()) : [];

  // We allow a DynamoDB and SQL data source to live alongside each other, although we don't (yet) support relationships between them. We'll
  // process the dbTypes separately so we can validate that there is only one SQL source.
  const dataSourceStrategies: Record<string, ModelDataSourceStrategy> = {};
  modelToDatasourceMap.forEach((value, key) => {
    if (!isDynamoDbType(value.dbType)) {
      return;
    }
    switch (value.provisionStrategy) {
      case 'DEFAULT':
        dataSourceStrategies[key] = DDB_DEFAULT_DATASOURCE_STRATEGY;
        break;
      case 'AMPLIFY_TABLE':
        dataSourceStrategies[key] = DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY;
        break;
      default:
        throw new Error(`Unsupported provisionStrategy ${value.provisionStrategy}`);
    }
  });

  const sqlDbType = getSqlDbTypeFromDataSourceTypes(datasourceMapValues);
  let sqlDirectiveDataSourceStrategies: SqlDirectiveDataSourceStrategy[] | undefined;
  if (sqlDbType) {
    const dbConnectionConfig = getDbConnectionConfig();
    const vpcConfiguration = await isSqlLambdaVpcConfigRequired(context, sqlDbType);
    const strategy: SQLLambdaModelDataSourceStrategy = {
      name: getDefaultStrategyNameForDbType(sqlDbType),
      dbType: sqlDbType,
      dbConnectionConfig,
      vpcConfiguration,
    };
    modelToDatasourceMap.forEach((value, key) => {
      if (!isSqlDbType(value.dbType)) {
        return;
      }
      dataSourceStrategies[key] = strategy;
    });

    let customSqlStatements: Record<string, string> | undefined;
    if (typeof projectConfig.customQueries === 'object') {
      customSqlStatements = {};
      (projectConfig.customQueries as Map<string, string>).forEach((value, key) => {
        customSqlStatements[key] = value;
      });
    }

    sqlDirectiveDataSourceStrategies = constructSqlDirectiveDataSourceStrategies(projectConfig.schema, strategy, customSqlStatements);
  }

  return {
    dataSourceStrategies,
    sqlDirectiveDataSourceStrategies,
  };
};

/**
 * buildAPIProject
 *
 * Note that SQL-backed API support is quite limited in this function. Notably:
 * - It requires there is only one SQL data source in the API
 * - It does not support declaring a SQL schema without a `@model` tied to a SQL data source
 *
 * TODO: Remove SQL handling from Gen1 CLI.
 */
const buildAPIProject = async (context: $TSContext, opts: TransformerProjectOptions): Promise<DeploymentResources | undefined> => {
  // The incoming opts.projectConfig is not actually compatible with DataSourceStrategiesProvider. We will correct that in this function.

  const schema = opts.projectConfig.schema.toString();
  // Skip building the project if the schema is blank
  if (!schema) {
    return undefined;
  }

  const { dataSourceStrategies, sqlDirectiveDataSourceStrategies } = await fixUpDataSourceStrategiesProvider(
    context,
    opts.projectConfig as unknown as Gen1ProjectConfiguration,
  );

  checkForUnsupportedDirectives(schema, { dataSourceStrategies });

  const useBetaSqlLayer = context?.input?.options?.[USE_BETA_SQL_LAYER] ?? false;

  // Read the RDS Mapping S3 Manifest only if the schema contains SQL models or @sql directives.
  let rdsLayerMapping: RDSLayerMapping | undefined = undefined;
  let rdsSnsTopicMapping: RDSSNSTopicMapping | undefined = undefined;
  if (containsSqlModelOrDirective(dataSourceStrategies, sqlDirectiveDataSourceStrategies)) {
    rdsLayerMapping = await getRDSLayerMapping(context, useBetaSqlLayer);
    rdsSnsTopicMapping = await getRDSSNSTopicMapping(context, useBetaSqlLayer);
  }

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
    dataSourceStrategies,
    sqlDirectiveDataSourceStrategies,
    printTransformerLog,
    rdsLayerMapping,
    rdsSnsTopicMapping,
    migrate: true,
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

const getRDSLayerMapping = async (context: $TSContext, useBetaSqlLayer = false): Promise<RDSLayerMapping> => {
  const bucket = `${ResourceConstants.RESOURCES.SQLLayerManifestBucket}${useBetaSqlLayer ? '-beta' : ''}`;
  const region = context.amplify.getProjectMeta().providers.awscloudformation.Region;
  const url = `https://${bucket}.s3.amazonaws.com/${ResourceConstants.RESOURCES.SQLLayerVersionManifestKeyPrefix}${region}`;
  const response = await fetch(url);
  if (response.status === 200) {
    const result = await response.text();
    const mapping = {
      [region]: {
        layerRegion: result,
      },
    };
    return mapping as RDSLayerMapping;
  } else {
    throw new Error(`Unable to retrieve layer mapping from ${url} with status code ${response.status}.`);
  }
};

const getRDSSNSTopicMapping = async (context: $TSContext, useBetaSqlLayer = false): Promise<RDSSNSTopicMapping> => {
  const bucket = `${ResourceConstants.RESOURCES.SQLLayerManifestBucket}${useBetaSqlLayer ? '-beta' : ''}`;
  const region = context.amplify.getProjectMeta().providers.awscloudformation.Region;
  const url = `https://${bucket}.s3.amazonaws.com/${ResourceConstants.RESOURCES.SQLSNSTopicARNManifestKeyPrefix}${region}`;
  const response = await fetch(url);
  if (response.status === 200) {
    const result = await response.text();
    const mapping = {
      [region]: {
        topicArn: result,
      },
    };
    return mapping as RDSSNSTopicMapping;
  } else {
    throw new Error(`Unable to retrieve sns topic ARN mapping from ${url} with status code ${response.status}.`);
  }
};

const isSqlLambdaVpcConfigRequired = async (context: $TSContext, dbType: ModelDataSourceStrategyDbType): Promise<VpcConfig | undefined> => {
  // If the database is in VPC, we will use the same VPC configuration for the SQL lambda.
  // Customers are required to add inbound rule for port 443 from the private subnet in the Security Group.
  // https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html#vpc-requirements-and-limitations
  const vpcSubnetConfig = await getSQLLambdaVpcConfig(context, dbType);

  return vpcSubnetConfig;
};

const getDbConnectionConfig = (): SqlModelDataSourceDbConnectionConfig => {
  const apiName = getAppSyncAPIName();
  const secretsKey = getSecretsKey();
  const paths = getExistingConnectionDbConnectionConfig(apiName, secretsKey);
  return paths;
};

const getSQLLambdaVpcConfig = async (context: $TSContext, dbType: ModelDataSourceStrategyDbType): Promise<VpcConfig> => {
  const [secretsKey, engine] = [getSecretsKey(), getImportedRDSTypeFromStrategyDbType(dbType)];
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

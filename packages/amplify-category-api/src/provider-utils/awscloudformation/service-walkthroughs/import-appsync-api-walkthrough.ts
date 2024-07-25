import * as path from 'path';
import * as fs from 'fs-extra';
import { ApiCategoryFacade, $TSContext } from '@aws-amplify/amplify-cli-core';
import { printer, prompter } from '@aws-amplify/amplify-prompts';
import {
  ImportAppSyncAPIInputs,
  ImportedDataSourceType,
  ImportedRDSType,
  ImportedDataSourceConfig,
  SQL_SCHEMA_FILE_NAME,
} from '@aws-amplify/graphql-transformer-core';
import { storeConnectionSecrets, getSecretsKey } from '../utils/rds-resources/database-resources';
import { constructDefaultGlobalAmplifyInput } from '@aws-amplify/graphql-schema-generator';
import { getAPIResourceDir, getAppSyncAPINames } from '../utils/amplify-meta-utils';
import { writeSchemaFile } from '../utils/graphql-schema-utils';
import { serviceMetadataFor } from '../utils/dynamic-imports';
import { serviceWalkthroughResultToAddApiRequest } from '../utils/service-walkthrough-result-to-add-api-request';
import { getCfnApiArtifactHandler } from '../cfn-api-artifact-handler';
import { serviceApiInputWalkthrough } from './appSync-walkthrough';
import { databaseConfigurationInputWalkthrough } from './appSync-rds-db-config';

const service = 'AppSync';

/**
 * Walkthrough for importing an AppSync API from an existing SQL database
 * @param context the Amplify CLI context
 * @returns inputs to create an AppSync API
 */
export const importAppSyncAPIWalkthrough = async (context: $TSContext): Promise<ImportAppSyncAPIInputs> => {
  let apiName: string;
  const existingAPIs = getAppSyncAPINames();
  if (existingAPIs?.length > 0) {
    apiName = existingAPIs[0];
  } else {
    const serviceMetadata = await serviceMetadataFor(service);
    const walkthroughResult = await serviceApiInputWalkthrough(context, serviceMetadata);
    const importAPIRequest = serviceWalkthroughResultToAddApiRequest(walkthroughResult);
    apiName = await getCfnApiArtifactHandler(context).createArtifacts(importAPIRequest);
  }

  const apiResourceDir = getAPIResourceDir(apiName);
  const pathToSchemaFile = path.join(apiResourceDir, SQL_SCHEMA_FILE_NAME);
  const secretsKey = await getSecretsKey();

  if (fs.pathExistsSync(pathToSchemaFile)) {
    printer.error('Imported Database schema already exists. Use "amplify api generate-schema" to fetch the latest updates to schema.');
    return {
      apiName: apiName,
    };
  }

  const engine = await promptDatabaseEngine();
  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine);

  await writeDefaultGraphQLSchema(context, pathToSchemaFile, databaseConfig);
  await storeConnectionSecrets(context, databaseConfig, apiName, secretsKey);

  return {
    apiName,
    dataSourceConfig: databaseConfig,
  };
};

const promptDatabaseEngine = async (): Promise<ImportedRDSType> => {
  const engine = await prompter.pick<'one', string>('Select the database type:', [
    {
      name: 'MySQL',
      value: ImportedRDSType.MYSQL as string,
    },
    {
      name: 'PostgreSQL',
      value: ImportedRDSType.POSTGRESQL as string,
    },
  ]);

  return engine as ImportedRDSType;
};

/**
 * Writes a default GraphQL schema from the global input template for the specified database engine
 * @param context the Amplify CLI context
 * @param pathToSchemaFile the output path for the default schema file
 * @param databaseConfig the database configuration
 */
export const writeDefaultGraphQLSchema = async (
  context: $TSContext,
  pathToSchemaFile: string,
  databaseConfig: ImportedDataSourceConfig,
): Promise<void> => {
  const dataSourceType = databaseConfig?.engine;
  if (Object.values(ImportedRDSType).includes(dataSourceType)) {
    const includeAuthRule = false;
    const globalAmplifyInputTemplate = await constructDefaultGlobalAmplifyInput(databaseConfig.engine, includeAuthRule);
    writeSchemaFile(pathToSchemaFile, globalAmplifyInputTemplate);
  } else {
    throw new Error(`Data source type ${dataSourceType} is not supported.`);
  }
};

/**
 * Returns a human-friendly string for the specified database engine
 * @param engine the database engine
 * @returns a human-friendly string for the specified database engine
 */
export const formatEngineName = (engine: ImportedDataSourceType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return 'MySQL';
    case ImportedRDSType.POSTGRESQL:
      return 'PostgreSQL';
    default:
      throw new Error(`Unsupported database engine: ${engine}`);
  }
};

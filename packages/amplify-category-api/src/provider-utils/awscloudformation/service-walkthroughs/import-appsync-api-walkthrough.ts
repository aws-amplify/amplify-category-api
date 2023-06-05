import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { prompter, printer, integer } from '@aws-amplify/amplify-prompts';
import {
  ImportAppSyncAPIInputs,
  ImportedDataSourceType,
  ImportedRDSType,
  ImportedDataSourceConfig,
  RDS_SCHEMA_FILE_NAME,
} from '@aws-amplify/graphql-transformer-core';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getAppSyncAPINames, getAPIResourceDir } from '../utils/amplify-meta-utils';
import { serviceApiInputWalkthrough } from './appSync-walkthrough';
import { serviceMetadataFor } from '../utils/dynamic-imports';
import { getCfnApiArtifactHandler } from '../cfn-api-artifact-handler';
import { serviceWalkthroughResultToAddApiRequest } from '../utils/service-walkthrough-result-to-add-api-request';
import { writeSchemaFile } from '../utils/graphql-schema-utils';
import { PREVIEW_BANNER, category } from '../../../category-constants';
import { storeConnectionSecrets, testDatabaseConnection, getSecretsKey } from '../utils/rds-secrets/database-secrets';
import { constructDefaultGlobalAmplifyInput } from '../utils/rds-input-utils';

const service = 'AppSync';

/**
 *
 * @param context
 */
export const importAppSyncAPIWalkthrough = async (context: $TSContext): Promise<ImportAppSyncAPIInputs> => {
  printer.warn(PREVIEW_BANNER);
  let apiName:string;
  const existingAPIs = getAppSyncAPINames();
  if (existingAPIs?.length > 0) {
    apiName = existingAPIs[0];
  } else {
    const serviceMetadata = await serviceMetadataFor(service);
    const walkthroughResult = await serviceApiInputWalkthrough(context, serviceMetadata);
    const importAPIRequest = serviceWalkthroughResultToAddApiRequest(walkthroughResult);
    apiName = await getCfnApiArtifactHandler(context).createArtifacts(importAPIRequest);
  }

  const engine = ImportedRDSType.MYSQL;
  const apiResourceDir = getAPIResourceDir(apiName);
  const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);
  const secretsKey = await getSecretsKey();

  if (fs.existsSync(pathToSchemaFile)) {
    printer.error('Imported Database schema already exists. Use "amplify api generate-schema" to fetch the latest updates to schema.');
    return {
      apiName,
    };
  }

  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine);

  await writeDefaultGraphQLSchema(context, pathToSchemaFile, databaseConfig);
  await storeConnectionSecrets(context, databaseConfig, apiName, secretsKey);
  await testDatabaseConnection(databaseConfig);

  return {
    apiName,
    dataSourceConfig: databaseConfig,
  };
};

/**
 *
 * @param context
 * @param pathToSchemaFile
 * @param databaseConfig
 */
export const writeDefaultGraphQLSchema = async (context: $TSContext, pathToSchemaFile: string, databaseConfig: ImportedDataSourceConfig) => {
  const dataSourceType = databaseConfig?.engine;
  if (Object.values(ImportedRDSType).includes(dataSourceType)) {
    const globalAmplifyInputTemplate = await constructDefaultGlobalAmplifyInput(context, databaseConfig.engine);
    writeSchemaFile(pathToSchemaFile, globalAmplifyInputTemplate);
  } else {
    throw new Error(`Data source type ${dataSourceType} is not supported.`);
  }
};

/**
 *
 * @param engine
 * @param database
 */
export const databaseConfigurationInputWalkthrough = async (engine: ImportedDataSourceType, database?: string): Promise<ImportedDataSourceConfig> => {
  const databaseName = database || await prompter.input(`Enter the name of the ${formatEngineName(engine)} database to import:`);
  const host = await prompter.input(`Enter the host for ${databaseName} database:`);
  const port = await prompter.input<'one', number>(`Enter the port for ${databaseName} database:`, {
    transform: (input) => Number.parseInt(input, 10),
    validate: integer(),
    initial: 3306,
  });
  // Get the database user credentials
  const username = await prompter.input(`Enter the username for ${databaseName} database user:`);
  const password = await prompter.input(`Enter the password for ${databaseName} database user:`, { hidden: true });

  return {
    engine,
    database: databaseName,
    host,
    port,
    username,
    password,
  };
};

/**
 *
 * @param engine
 */
export const formatEngineName = (engine: ImportedDataSourceType) => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return 'MySQL';
    case ImportedRDSType.POSTGRESQL:
      return 'PostgreSQL';
    default:
      throw new Error(`Unsupported database engine: ${engine}`);
  }
};

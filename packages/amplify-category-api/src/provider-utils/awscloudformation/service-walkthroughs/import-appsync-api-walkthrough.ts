import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { prompter, printer, integer } from '@aws-amplify/amplify-prompts';
import { getAppSyncAPINames } from '../utils/amplify-meta-utils';
import { serviceApiInputWalkthrough } from './appSync-walkthrough';
import { serviceMetadataFor } from '../utils/dynamic-imports';
import { getCfnApiArtifactHandler } from '../cfn-api-artifact-handler';
import { serviceWalkthroughResultToAddApiRequest } from '../utils/service-walkthrough-result-to-add-api-request';
import { writeSchemaFile } from '../utils/graphql-schema-utils';
import {
  ImportAppSyncAPIInputs,
  ImportedDataSourceType,
  ImportedRDSType,
  ImportedDataSourceConfig,
  RDSConnectionSecrets,
} from '@aws-amplify/graphql-transformer-core';
import { storeConnectionSecrets, getSecretsKey, getExistingConnectionSecrets } from '../utils/rds-resources/database-resources';
import { parseDatabaseUrl } from '../utils/database-url';
import * as path from 'path';
import { RDS_SCHEMA_FILE_NAME } from '@aws-amplify/graphql-transformer-core';
import { constructDefaultGlobalAmplifyInput } from '../utils/rds-input-utils';
import { getAPIResourceDir } from '../utils/amplify-meta-utils';
import * as fs from 'fs-extra';

const service = 'AppSync';

export const importAppSyncAPIWalkthrough = async (context: $TSContext): Promise<ImportAppSyncAPIInputs> => {
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
    printer.error(`Imported Database schema already exists. Use "amplify api generate-schema" to fetch the latest updates to schema.`);
    return {
      apiName: apiName,
    };
  }

  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine);

  await writeDefaultGraphQLSchema(context, pathToSchemaFile, databaseConfig);
  await storeConnectionSecrets(context, databaseConfig, apiName, secretsKey);

  return {
    apiName,
    dataSourceConfig: databaseConfig,
  };
};

export const writeDefaultGraphQLSchema = async (
  context: $TSContext,
  pathToSchemaFile: string,
  databaseConfig: ImportedDataSourceConfig,
): Promise<void> => {
  const dataSourceType = databaseConfig?.engine;
  if (Object.values(ImportedRDSType).includes(dataSourceType)) {
    const globalAmplifyInputTemplate = await constructDefaultGlobalAmplifyInput(context, databaseConfig.engine);
    writeSchemaFile(pathToSchemaFile, globalAmplifyInputTemplate);
  } else {
    throw new Error(`Data source type ${dataSourceType} is not supported.`);
  }
};

export const databaseConfigurationInputWalkthrough = async (
  engine: ImportedDataSourceType,
): Promise<ImportedDataSourceConfig> => {
  printer.info('Please provide the following database connection information:');
  const url = await prompter.input('Enter the database url or host name:');

  let isValidUrl = true;
  const parsedDatabaseUrl = parseDatabaseUrl(url);
  let {
    host,
    port,
    database,
    username,
    password,
  } = parsedDatabaseUrl;

  if (!host) {
    isValidUrl = false;
    host = url;
  }
  if (!isValidUrl || !port) {
    port = await prompter.input<'one', number>('Enter the port number:', {
      transform: (input) => Number.parseInt(input, 10),
      validate: integer(),
      initial: 3306,
    });
  }

  // Get the database user credentials
  if (!isValidUrl || !username) {
    username = await prompter.input('Enter the username:');
  }

  if (!isValidUrl || !password) {
    password = await prompter.input('Enter the password:', { hidden: true });
  }

  if (!isValidUrl || !database) {
    database = await prompter.input('Enter the database name:');
  }

  return {
    engine,
    database,
    host,
    port,
    username,
    password,
  };
};

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

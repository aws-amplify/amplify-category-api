import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { prompter, printer, integer } from '@aws-amplify/amplify-prompts';
import { getAppSyncAPINames } from '../utils/amplify-meta-utils';
import { serviceApiInputWalkthrough } from './appSync-walkthrough';
import { serviceMetadataFor } from '../utils/dynamic-imports';
import { getCfnApiArtifactHandler } from '../cfn-api-artifact-handler';
import { serviceWalkthroughResultToAddApiRequest } from '../utils/service-walkthrough-result-to-add-api-request';
import { writeSchemaFile } from '../utils/graphql-schema-utils';
import {
  constructDefaultGlobalAmplifyInput,
  ImportAppSyncAPIInputs,
  ImportedDataSourceType,
  ImportedRDSType,
  ImportedDataSourceConfig,
} from '@aws-amplify/graphql-transformer-core';
import { PREVIEW_BANNER, category } from '../../../category-constants';
import { storeConnectionSecrets, testDatabaseConnection, readDatabaseNameFromMeta } from '../utils/rds-secrets/database-secrets';
import * as path from 'path';
import { RDS_SCHEMA_FILE_NAME } from '@aws-amplify/graphql-transformer-core';
import { getAPIResourceDir } from '../utils/amplify-meta-utils';

const service = 'AppSync';

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
  const database = await readDatabaseNameFromMeta(apiName, engine);
  if(database) {
    printer.error(`Imported Database "${database}" already exists. Use "amplify api generate-schema" to fetch the schema.`);
    return {
      apiName: apiName
    }
  }

  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine);

  const apiResourceDir = getAPIResourceDir(apiName);
  const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);
  await writeDefaultGraphQLSchema(context, pathToSchemaFile, databaseConfig);
  await storeConnectionSecrets(context, databaseConfig, apiName);
  await updateAPIArtifacts(context, apiName, engine, databaseConfig.database);
  await testDatabaseConnection(databaseConfig);
  return {
    apiName: apiName,
    dataSourceConfig: databaseConfig,
  };
};

export const writeDefaultGraphQLSchema = async (context: $TSContext, pathToSchemaFile: string, databaseConfig: ImportedDataSourceConfig) => {
  const dataSourceType = databaseConfig?.engine;
  if(Object.values(ImportedRDSType).includes(dataSourceType)) {
    const globalAmplifyInputTemplate = await constructDefaultGlobalAmplifyInput(context, databaseConfig.engine);
    writeSchemaFile(pathToSchemaFile, globalAmplifyInputTemplate);
  }
  else {
    throw new Error(`Data source type ${dataSourceType} is not supported.`);
  }
};

export const updateAPIArtifacts = async (context: $TSContext, apiName: string, engine: ImportedDataSourceType, database: string) => {
  const dataSourceConfig = {};
  dataSourceConfig[engine] = database; // This will eventually be a list
  context.amplify.updateamplifyMetaAfterResourceUpdate(category, apiName, 'dataSourceConfig', dataSourceConfig);
};

export const databaseConfigurationInputWalkthrough = async (engine: ImportedDataSourceType, database?: string): Promise<ImportedDataSourceConfig> => {
  const databaseName = database || await prompter.input(`Enter the name of the ${formatEngineName(engine)} database to import:`);
  const host = await prompter.input(`Enter the host for ${databaseName} database:`);
  const port = await prompter.input<'one', number>(`Enter the port for ${databaseName} database:`, {
    transform: input => Number.parseInt(input, 10),
    validate: integer(),
    initial: 3306
  });
  // Get the database user credentials
  const username = await prompter.input(`Enter the username for ${databaseName} database user:`);
  const password = await prompter.input(`Enter the password for ${databaseName} database user:`, { hidden: true });

  return {
    engine: engine,
    database: databaseName,
    host: host,
    port: port,
    username: username,
    password: password
  };
};

export const formatEngineName = (engine: ImportedDataSourceType) => {
  switch(engine) {
    case ImportedRDSType.MYSQL:
      return "MySQL";
    case ImportedRDSType.POSTGRESQL:
      return "PostgreSQL";
    default:
      throw new Error(`Unsupported database engine: ${engine}`);
  }
};

import { $TSContext } from 'amplify-cli-core';
import { prompter, printer, integer } from 'amplify-prompts';
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
import { storeConnectionSecrets, testDatabaseConnection } from '../utils/rds-secrets/database-secrets';

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
  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine);

  await testDatabaseConnection(databaseConfig);
  await storeConnectionSecrets(context, databaseConfig, apiName);
  await updateAPIArtifacts(context, apiName, engine, databaseConfig.database);
  return {
    apiName: apiName,
    dataSourceConfig: databaseConfig,
  };
};

export const writeDefaultGraphQLSchema = async (context: $TSContext, pathToSchemaFile: string, dataSourceType: ImportedDataSourceType) => {
  if(Object.values(ImportedRDSType).includes(dataSourceType)) {
    const globalAmplifyInputTemplate = await constructDefaultGlobalAmplifyInput(context, dataSourceType);
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
  const databaseName = database || await prompter.input(`Enter the name of the ${engine} database to import:`);
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

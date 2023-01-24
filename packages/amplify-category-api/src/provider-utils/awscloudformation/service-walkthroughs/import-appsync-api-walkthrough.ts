import { $TSContext } from 'amplify-cli-core';
import { prompter } from 'amplify-prompts';
import { getAppSyncAPINames } from '../utils/amplify-meta-utils';
import { ImportAppSyncAPIInputs, ImportedDataSourceType, ImportedRDSType } from '../service-walkthrough-types/import-appsync-api-types';
import { serviceApiInputWalkthrough } from './appSync-walkthrough';
import { serviceMetadataFor } from '../utils/dynamic-imports';
import { getCfnApiArtifactHandler } from '../cfn-api-artifact-handler';
import { serviceWalkthroughResultToAddApiRequest } from '../utils/service-walkthrough-result-to-add-api-request';
import { writeSchemaFile } from '../utils/graphql-schema-utils';
import { constructDefaultGlobalAmplifyInput } from '../utils/import-rds-utils/globalAmplifyInputs';

const service = 'AppSync';

export const importAppSyncAPIWalkthrough = async (context: $TSContext): Promise<ImportAppSyncAPIInputs> => {
  let apiName:string;
  const existingAPIs = getAppSyncAPINames();
  if (existingAPIs?.length > 0) {
    apiName = existingAPIs[0];
  }
  else {
    const serviceMetadata = await serviceMetadataFor(service);
    const walkthroughResult = await serviceApiInputWalkthrough(context, serviceMetadata);
    const importAPIRequest = serviceWalkthroughResultToAddApiRequest(walkthroughResult);
    apiName = await getCfnApiArtifactHandler(context).createArtifacts(importAPIRequest);
  }

  // Get the Imported Data Source Type
  const supportedDataSourceTypes = [
    { name: 'GraphQL (Existing MySQL data source)', value: ImportedRDSType.MYSQL },
    { name: 'GraphQL (Existing PostgreSQL data source)', value: ImportedRDSType.POSTGRESQL }
  ];
  const importedDataSourceType = await prompter.pick<'one', string>(
    `Select from one of the below mentioned services:`,
    supportedDataSourceTypes
  ) as ImportedDataSourceType;

  return {
    apiName: apiName,
    dataSourceType: importedDataSourceType
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

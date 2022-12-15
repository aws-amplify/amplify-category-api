import { v4 as uuid } from 'uuid';
import { $TSContext } from 'amplify-cli-core';
import { prompter, alphanumeric } from 'amplify-prompts';
import { getAppSyncAPINames } from '../utils/amplify-meta-utils';
import { ImportAppSyncAPIInputs, ImportedDataSourceType, ImportedRDSType } from '../service-walkthrough-types/import-appsync-api-types';

export const importAppSyncAPIWalkthrough = async (context: $TSContext): Promise<ImportAppSyncAPIInputs> => {
  const existingAPIs = getAppSyncAPINames();

  // Get the name for the imported API
  const defaultAPIName = context.amplify.getProjectConfig()?.projectName || `api${uuid().split('-')}`;
  const apiName = await prompter.input('Provide API name:', { validate: alphanumeric(), initial: defaultAPIName });

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

import { $TSContext } from 'amplify-cli-core';
import { printer } from 'amplify-prompts';
import * as path from 'path';
import fs from 'fs-extra';
import { importAppSyncAPIWalkthrough } from '../../provider-utils/awscloudformation/service-walkthroughs/import-appsync-api-walkthrough';
import { RDS_SCHEMA_FILE_NAME, ImportedRDSType } from '../../provider-utils/awscloudformation/service-walkthrough-types/import-appsync-api-types';
import { constructGlobalAmplifyInput } from '../../provider-utils/awscloudformation/utils/import-rds-utils/globalAmplifyInputs';
import { getAPIResourceDir } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { writeSchemaFile } from '../../provider-utils/awscloudformation/utils/graphql-schema-utils';

const subcommand = 'import';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  const importAppSyncAPIWalkInputs = await importAppSyncAPIWalkthrough(context);
  
  // ensure imported API resource artifacts are created
  const apiResourceDir = getAPIResourceDir(importAppSyncAPIWalkInputs.apiName);
  fs.ensureDirSync(apiResourceDir);

  if(Object.values(ImportedRDSType).includes(importAppSyncAPIWalkInputs.dataSourceType)) {
    const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);
    const globalAmplifyInputTemplate = constructGlobalAmplifyInput(importAppSyncAPIWalkInputs.dataSourceType);
    writeSchemaFile(pathToSchemaFile, globalAmplifyInputTemplate);
    printer.info(`Update the database connection details in the file at ${pathToSchemaFile}. Run "amplify api generate-schema" to fetch the schema.`);
  }
  // TODO: add/update artifacts post add api
  printer.info('Successfully initialized the API. Run "amplify api generate-schema" to import the GraphQL schema.');
};

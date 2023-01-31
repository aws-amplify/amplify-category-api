import { $TSContext } from 'amplify-cli-core';
import { printer } from 'amplify-prompts';
import * as path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import { MySQLDataSourceAdapter, DataSourceAdapter, MySQLDataSourceConfig } from '@aws-amplify/graphql-schema-generator';
import { getDBUserSecretsWalkthrough } from '../../provider-utils/awscloudformation/service-walkthroughs/generate-graphql-schema-walkthrough';
import { ImportedRDSType, RDS_SCHEMA_FILE_NAME } from '../../provider-utils/awscloudformation/service-walkthrough-types/import-appsync-api-types';
import { getRDSGlobalAmplifyInput, getRDSDBConfigFromAmplifyInput } from '../../provider-utils/awscloudformation/utils/import-rds-utils/globalAmplifyInputs';
import { getAppSyncAPIName, getAPIResourceDir } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { storeConnectionSecrets } from '../../provider-utils/awscloudformation/utils/rds-secrets/database-secrets';

const subcommand = 'update-secrets';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  const apiName = getAppSyncAPIName();
  const apiResourceDir = getAPIResourceDir(apiName);

  // proceed if there are any existing imported Relational Data Sources
  const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);
  if(!fs.existsSync(pathToSchemaFile)) {
    printer.info('No imported Data Sources to update the secrets.');
    return;
  }

  // read and validate the RDS connection parameters
  const amplifyInput = await getRDSGlobalAmplifyInput(context, pathToSchemaFile);
  const config = await getRDSDBConfigFromAmplifyInput(context, amplifyInput);

  const secrets = await getDBUserSecretsWalkthrough(config.database);
  config.username = secrets.username;
  config.password = secrets.password;
  
  // Establish the connection
  let adapter: DataSourceAdapter;
  switch(config.engine) {
    case ImportedRDSType.MYSQL:
      adapter = new MySQLDataSourceAdapter(config as MySQLDataSourceConfig);
      break;
    default:
      printer.error('Only MySQL Data Source is supported.');
  }
  
  try {
    await adapter.initialize();
  } catch(error) {
    printer.error('Failed to connect to the specified RDS Data Source. Check the connection details in the schema and re-try. Use "amplify api update-secrets" to update the user credentials.');
    console.log(error?.message);
    throw(error);      
  };
  adapter.cleanup();
  await storeConnectionSecrets(context, config.database, secrets, apiName);
  printer.info(`Successfully updated the secrets for ${config.database} database.`);
};

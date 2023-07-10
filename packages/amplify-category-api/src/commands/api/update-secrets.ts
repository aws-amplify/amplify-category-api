import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import * as path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import { databaseConfigurationInputWalkthrough } from '../../provider-utils/awscloudformation/service-walkthroughs/import-appsync-api-walkthrough';
import { ImportedRDSType, RDS_SCHEMA_FILE_NAME, ImportedDataSourceConfig } from '@aws-amplify/graphql-transformer-core';
import { getAppSyncAPIName, getAPIResourceDir } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import {
  storeConnectionSecrets,
  testDatabaseConnection,
  getSecretsKey,
  getDatabaseName,
} from '../../provider-utils/awscloudformation/utils/rds-secrets/database-secrets';

const subcommand = 'update-secrets';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  const apiName = getAppSyncAPIName();
  const apiResourceDir = getAPIResourceDir(apiName);

  // proceed if there are any existing imported Relational Data Sources
  const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);
  if (!fs.existsSync(pathToSchemaFile)) {
    printer.info('No imported Data Sources to update the secrets.');
    return;
  }

  const engine = ImportedRDSType.MYSQL;
  const secretsKey = await getSecretsKey();
  const database = await getDatabaseName(context, apiName, secretsKey);

  // read and validate the RDS connection parameters
  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine, database);

  await testDatabaseConnection(databaseConfig);
  await storeConnectionSecrets(context, databaseConfig, apiName, secretsKey);

  printer.info(`Successfully updated the secrets for ${database} database.`);
};

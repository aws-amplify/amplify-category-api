import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { ImportedDataSourceConfig, SQL_SCHEMA_FILE_NAME } from '@aws-amplify/graphql-transformer-core';
import fs from 'fs-extra';
import { parse } from 'graphql';
import * as path from 'path';
import { PREVIEW_BANNER } from '../../category-constants';
import { databaseConfigurationInputWalkthrough } from '../../provider-utils/awscloudformation/service-walkthroughs/appSync-rds-db-config';
import { getAPIResourceDir, getAppSyncAPIName } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { getEngineInput } from '../../provider-utils/awscloudformation/utils/rds-input-utils';
import { getSecretsKey, storeConnectionSecrets } from '../../provider-utils/awscloudformation/utils/rds-resources/database-resources';

const subcommand = 'update-secrets';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  printer.warn(PREVIEW_BANNER);

  const apiName = getAppSyncAPIName();
  const apiResourceDir = getAPIResourceDir(apiName);

  // proceed if there are any existing imported Relational Data Sources
  const pathToSchemaFile = path.join(apiResourceDir, SQL_SCHEMA_FILE_NAME);
  if (!fs.existsSync(pathToSchemaFile)) {
    printer.info('No imported Data Sources to update the secrets.');
    return;
  }

  const importedSchema = parse(fs.readFileSync(pathToSchemaFile, 'utf8'));
  const engine = await getEngineInput(importedSchema);

  const secretsKey = await getSecretsKey();

  // read and validate the RDS connection parameters
  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine);

  await storeConnectionSecrets(context, databaseConfig, apiName, secretsKey);

  printer.info('Successfully updated the secrets for the database.');
};

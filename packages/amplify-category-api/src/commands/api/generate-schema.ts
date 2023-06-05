import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import * as path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import {
  ImportedRDSType,
  RDS_SCHEMA_FILE_NAME,
  ImportedDataSourceConfig,
  RDSConnectionSecrets,
} from '@aws-amplify/graphql-transformer-core';
import { databaseConfigurationInputWalkthrough } from '../../provider-utils/awscloudformation/service-walkthroughs/import-appsync-api-walkthrough';
import { getAppSyncAPIName, getAPIResourceDir } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import {
  getExistingConnectionSecrets, storeConnectionSecrets, getSecretsKey, getDatabaseName,
} from '../../provider-utils/awscloudformation/utils/rds-secrets/database-secrets';
import { writeSchemaFile, generateRDSSchema } from '../../provider-utils/awscloudformation/utils/graphql-schema-utils';
import { PREVIEW_BANNER } from '../../category-constants';

const subcommand = 'generate-schema';

export const name = subcommand;

/**
 *
 * @param context
 */
export const run = async (context: $TSContext) => {
  printer.warn(PREVIEW_BANNER);

  // Disable the command for now
  throw new Error('This command has been disabled.');

  const apiName = getAppSyncAPIName();
  const apiResourceDir = getAPIResourceDir(apiName);

  // proceed if there are any existing imported Relational Data Sources
  const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);

  if (!fs.existsSync(pathToSchemaFile)) {
    printer.info('No imported Data Sources to Generate GraphQL Schema.');
    return;
  }

  const engine = ImportedRDSType.MYSQL;
  const secretsKey = await getSecretsKey();
  const database = await getDatabaseName(context, apiName, secretsKey);
  if (!database) {
    printer.error('Cannot fetch the imported database name to generate the schema. Use "amplify api update-secrets" to update the database information.');
    return;
  }

  // read and validate the RDS connection secrets
  const { secrets, storeSecrets } = await getConnectionSecrets(context, apiName, secretsKey, engine);
  const databaseConfig: ImportedDataSourceConfig = {
    ...secrets,
    engine,
  };

  const schemaString = await generateRDSSchema(context, databaseConfig, pathToSchemaFile);
  // If connection is successful, store the secrets in parameter store
  if (storeSecrets) {
    await storeConnectionSecrets(context, secrets, apiName, secretsKey);
  }
  writeSchemaFile(pathToSchemaFile, schemaString);

  if (_.isEmpty(schemaString)) {
    printer.warn('If your schema file is empty, it is likely that your database has no tables.');
  }
  printer.info(`Successfully imported the schema definition for ${databaseConfig.database} database into ${pathToSchemaFile}`);
};

const getConnectionSecrets = async (context: $TSContext, apiName: string, secretsKey: string, engine: ImportedRDSType): Promise<{ secrets: RDSConnectionSecrets, storeSecrets: boolean }> => {
  const existingSecrets = await getExistingConnectionSecrets(context, secretsKey, apiName);
  if (existingSecrets) {
    return {
      secrets: existingSecrets,
      storeSecrets: false,
    };
  }

  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine);
  return {
    secrets: databaseConfig,
    storeSecrets: true,
  };
};

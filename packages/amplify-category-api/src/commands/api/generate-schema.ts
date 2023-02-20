import { $TSContext } from 'amplify-cli-core';
import { printer } from 'amplify-prompts';
import * as path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import { databaseConfigurationInputWalkthrough } from '../../provider-utils/awscloudformation/service-walkthroughs/import-appsync-api-walkthrough';
import {
  ImportedRDSType,
  RDS_SCHEMA_FILE_NAME,
  ImportedDataSourceConfig,
  RDSConnectionSecrets,
} from '@aws-amplify/graphql-transformer-core';
import { getAppSyncAPIName, getAPIResourceDir } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { getExistingConnectionSecrets, storeConnectionSecrets, readDatabaseNameFromMeta } from '../../provider-utils/awscloudformation/utils/rds-secrets/database-secrets';
import { writeSchemaFile, generateRDSSchema } from '../../provider-utils/awscloudformation/utils/graphql-schema-utils';
import { PREVIEW_BANNER } from '../../category-constants';

const subcommand = 'generate-schema';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  printer.warn(PREVIEW_BANNER);
  const apiName = getAppSyncAPIName();
  const apiResourceDir = getAPIResourceDir(apiName);

  // proceed if there are any existing imported Relational Data Sources
  const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);

  if(!fs.existsSync(pathToSchemaFile)) {
    printer.info('No imported Data Sources to Generate GraphQL Schema.');
    return;
  }

  const engine = ImportedRDSType.MYSQL;
  const database = await readDatabaseNameFromMeta(apiName, engine);
  
  // read and validate the RDS connection secrets
  const { secrets, storeSecrets } = await getConnectionSecrets(context, apiName, database, engine);
  const databaseConfig: ImportedDataSourceConfig = {
    ...secrets,
    engine: engine,
    database: database,
  };

  const schemaString = await generateRDSSchema(context, databaseConfig, pathToSchemaFile);
  // If connection is successful, store the secrets in parameter store
  if(storeSecrets) {
    await storeConnectionSecrets(context, secrets, apiName);
  }
  writeSchemaFile(pathToSchemaFile, schemaString);

  if(_.isEmpty(schemaString)) {
    printer.warn('If your schema file is empty, it is likely that your database has no tables.');
  }
  printer.info(`Successfully imported the schema definition for ${databaseConfig.database} database into ${pathToSchemaFile}`);
};

const getConnectionSecrets = async (context: $TSContext, apiName: string, database: string, engine: ImportedRDSType): Promise<{ secrets: RDSConnectionSecrets, storeSecrets: boolean }> => {
  const existingSecrets = await getExistingConnectionSecrets(context, database, apiName);
  if(existingSecrets) {
    return {
      secrets: existingSecrets,
      storeSecrets: false
    };
  }

  const databaseConfig: ImportedDataSourceConfig = await databaseConfigurationInputWalkthrough(engine);
  return {
    secrets: databaseConfig,
    storeSecrets: true
  };
};

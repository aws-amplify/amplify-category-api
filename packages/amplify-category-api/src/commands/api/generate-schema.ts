import * as path from 'path';
import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import fs from 'fs-extra';
import _ from 'lodash';
import { RDS_SCHEMA_FILE_NAME, ImportedDataSourceConfig } from '@aws-amplify/graphql-transformer-core';
import { getAppSyncAPIName, getAPIResourceDir } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import {
  storeConnectionSecrets,
  getSecretsKey,
  getDatabaseName,
  getConnectionSecrets,
} from '../../provider-utils/awscloudformation/utils/rds-resources/database-resources';
import { writeSchemaFile, generateRDSSchema } from '../../provider-utils/awscloudformation/utils/graphql-schema-utils';
import { PREVIEW_BANNER } from '../../category-constants';
import { parse } from 'graphql';
import { getEngineInput } from '../../provider-utils/awscloudformation/utils/rds-input-utils';

const subcommand = 'generate-schema';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  printer.warn(PREVIEW_BANNER);
  const apiName = getAppSyncAPIName();
  const apiResourceDir = getAPIResourceDir(apiName);

  // proceed if there are any existing imported Relational Data Sources
  const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);

  if (!fs.existsSync(pathToSchemaFile)) {
    printer.info('No imported Data Sources to Generate GraphQL Schema.');
    return;
  }

  const importedSchema = parse(fs.readFileSync(pathToSchemaFile, 'utf8'));
  const engine = await getEngineInput(importedSchema);

  const secretsKey = getSecretsKey();
  const database = await getDatabaseName(context, apiName, secretsKey);
  if (!database) {
    printer.error(
      'Cannot fetch the imported database name to generate the schema. Use "amplify api update-secrets" to update the database information.',
    );
    return;
  }

  // read and validate the RDS connection secrets
  const { secrets, storeSecrets } = await getConnectionSecrets(context, secretsKey, engine);
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

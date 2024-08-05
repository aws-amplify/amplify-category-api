import { $TSContext, AmplifyError, ApiCategoryFacade } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { graphqlSchemaFromSQLSchema } from '@aws-amplify/graphql-schema-generator';
import { ImportedDataSourceConfig, ImportedRDSType, SQL_SCHEMA_FILE_NAME } from '@aws-amplify/graphql-transformer-core';
import fs from 'fs-extra';
import { parse } from 'graphql';
import _ from 'lodash';
import * as path from 'path';
import { PREVIEW_BANNER } from '../../category-constants';
import { getAPIResourceDir, getAppSyncAPIName } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { generateRDSSchema, writeSchemaFile } from '../../provider-utils/awscloudformation/utils/graphql-schema-utils';
import { getEngineInput } from '../../provider-utils/awscloudformation/utils/rds-input-utils';
import {
  getConnectionSecrets,
  getDatabaseName,
  getSecretsKey,
  storeConnectionSecrets,
} from '../../provider-utils/awscloudformation/utils/rds-resources/database-resources';

const subcommand = 'generate-schema';

export const name = subcommand;

export const run = async (context: $TSContext): Promise<void> => {
  const transformerVersion = await ApiCategoryFacade.getTransformerVersion(context);
  if (transformerVersion !== 2) {
    throw new AmplifyError('InvalidDirectiveError', {
      message: 'Imported SQL schema can only generate a GraphQL schema with the version 2 transformer.',
    });
  }
  const sqlSchema = context.parameters?.options?.['sql-schema'];
  const engineType = context.parameters?.options?.['engine-type'];
  const out = context.parameters?.options?.out;
  // unauthenticated flow
  if (sqlSchema || engineType || out) {
    if (!(sqlSchema && engineType && out)) {
      if (!sqlSchema) {
        throw new AmplifyError('UserInputError', { message: 'A SQL schema must be provided with --sql-schema' });
      }
      if (!engineType) {
        throw new AmplifyError('UserInputError', { message: 'An engine type must be provided with --engine-type' });
      }
      if (!out) {
        throw new AmplifyError('UserInputError', { message: 'An output path must be provided with --out' });
      }
    }
    if (!Object.values(ImportedRDSType).includes(engineType)) {
      throw new AmplifyError('UserInputError', { message: `${engineType} is not a supported engine type.` });
    }
    if (!fs.existsSync(sqlSchema)) {
      throw new AmplifyError('UserInputError', { message: `SQL schema file ${sqlSchema} does not exists.` });
    }
    const schema = await graphqlSchemaFromSQLSchema(fs.readFileSync(sqlSchema, 'utf8'), engineType);
    writeSchemaFile(out, schema);
  } else {
    printer.warn(PREVIEW_BANNER);
    const apiName = getAppSyncAPIName();
    const apiResourceDir = getAPIResourceDir(apiName);

    // proceed if there are any existing imported Relational Data Sources
    const pathToSchemaFile = path.join(apiResourceDir, SQL_SCHEMA_FILE_NAME);

    if (!fs.existsSync(pathToSchemaFile)) {
      throw new AmplifyError('UserInputError', { message: 'No imported Data Sources to Generate GraphQL Schema.' });
    }

    const importedSchema = parse(fs.readFileSync(pathToSchemaFile, 'utf8'));
    const engine = await getEngineInput(importedSchema);

    const secretsKey = getSecretsKey();
    const database = await getDatabaseName(context, apiName, secretsKey);
    if (!database) {
      throw new AmplifyError('UserInputError', {
        message:
          'Cannot fetch the imported database name to generate the schema. Use "amplify api update-secrets" to update the database information.',
      });
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
  }
};

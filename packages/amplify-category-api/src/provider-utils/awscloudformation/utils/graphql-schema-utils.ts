import * as os from 'os';
import { ImportedRDSType, ImportedDataSourceConfig } from '@aws-amplify/graphql-transformer-core';
import * as fs from 'fs-extra';
import {
  MySQLDataSourceAdapter,
  generateGraphQLSchema,
  Schema,
  Engine,
  DataSourceAdapter,
  MySQLDataSourceConfig,
} from '@aws-amplify/graphql-schema-generator';
import { printer } from '@aws-amplify/amplify-prompts';
import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { constructRDSGlobalAmplifyInput } from './rds-input-utils';

export const writeSchemaFile = (pathToSchemaFile: string, schemaString: string) => {
  fs.ensureFileSync(pathToSchemaFile);
  fs.writeFileSync(pathToSchemaFile, schemaString);
};

export const generateRDSSchema = async (
  context: $TSContext,
  databaseConfig: ImportedDataSourceConfig,
  pathToSchemaFile: string,
): Promise<string> => {
  // Establish the connection
  let adapter: DataSourceAdapter;
  let schema: Schema;
  switch (databaseConfig.engine) {
    case ImportedRDSType.MYSQL:
      adapter = new MySQLDataSourceAdapter(databaseConfig as MySQLDataSourceConfig);
      schema = new Schema(new Engine('MySQL'));
      break;
    default:
      printer.error('Only MySQL Data Source is supported.');
  }

  try {
    await adapter.initialize();
  } catch (error) {
    printer.error(
      'Failed to connect to the specified RDS Data Source. Check the connection details in the schema and re-try. Use "amplify api update-secrets" to update the user credentials.',
    );
    throw error;
  }

  const models = await adapter.getModels();
  adapter.cleanup();
  models.forEach((m) => schema.addModel(m));

  const schemaString =
    (await constructRDSGlobalAmplifyInput(context, databaseConfig, pathToSchemaFile)) + os.EOL + os.EOL + generateGraphQLSchema(schema);
  return schemaString;
};

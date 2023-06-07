import { ImportedRDSType, ImportedDataSourceConfig } from '@aws-amplify/graphql-transformer-core';
import * as fs from 'fs-extra';
import { MySQLDataSourceAdapter, generateGraphQLSchema, Schema, Engine, DataSourceAdapter, MySQLDataSourceConfig, getHostVpc, provisionSchemaInspectorLambda } from '@aws-amplify/graphql-schema-generator';
import * as os from 'os';
import { constructRDSGlobalAmplifyInput } from './rds-input-utils';
import { printer, prompter } from '@aws-amplify/amplify-prompts';
import { $TSContext, AmplifyError, stateManager } from '@aws-amplify/amplify-cli-core';
import { getVpcMetadataLambdaName } from './rds-resources/database-resources';

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
  const UNABLE_TO_CONNECT_MESSAGE = 'Failed to connect to the specified RDS Data Source. Check the connection details in the schema and re-try. Use "amplify api update-secrets" to update the user credentials.';

  switch(databaseConfig.engine) {
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
    // If connection is unsuccessful, try connecting from VPC
    if (error.code === 'ETIMEDOUT') {
      const canConnectFromVpc = await retryWithVpcLambda(context, databaseConfig, adapter);
      if (!canConnectFromVpc) {
        throw new AmplifyError('UserInputError', {
          message: UNABLE_TO_CONNECT_MESSAGE,
        });
      }
    } else {
      throw error;
    }
  }

  const models = await adapter.getModels();
  adapter.cleanup();
  models.forEach(m => schema.addModel(m));

  const schemaString = await constructRDSGlobalAmplifyInput(context, databaseConfig, pathToSchemaFile) + os.EOL + os.EOL + generateGraphQLSchema(schema);
  return schemaString;
};

const retryWithVpcLambda = async (context, databaseConfig, adapter): Promise<boolean> => {
  const meta = stateManager.getMeta();
  const { AmplifyAppId, Region } = meta.providers.awscloudformation;
  const vpc = await getHostVpc(databaseConfig.host, Region);
  const { amplify } = context;
  const { envName } = amplify.getEnvInfo();

  if (vpc) {
    const shouldTryVpc = await prompter.confirmContinue(`Unable to connect to the database from this machine. Would you like to try from VPC '${vpc.vpcId}'?`);
    
    if (shouldTryVpc) {
      const schemaInspectorLambda = getVpcMetadataLambdaName(AmplifyAppId, envName);
      await provisionSchemaInspectorLambda(schemaInspectorLambda, vpc, Region);
      adapter.useVpc(schemaInspectorLambda, Region);
      await adapter.initialize();
      return true;
    }
  }

  return false;
};

import { $TSAny, $TSContext } from 'amplify-cli-core';
import { printer } from 'amplify-prompts';
import * as path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import { MySQLDataSourceAdapter, generateGraphQLSchema, Schema, Engine, DataSourceAdapter } from '@aws-amplify/graphql-schema-generator';
import { getDBUserSecretsWalkthrough } from '../../provider-utils/awscloudformation/service-walkthroughs/generate-graphql-schema-walkthrough';
import { ImportedRDSType, RDS_SCHEMA_FILE_NAME } from '../../provider-utils/awscloudformation/service-walkthrough-types/import-appsync-api-types';
import { readGlobalAmplifyInput, validateInputConfig } from '../../provider-utils/awscloudformation/utils/import-rds-utils/globalAmplifyInputs';
import { getAppSyncAPIName, getAPIResourceDir } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { getExistingConnectionSecrets, storeConnectionSecrets } from '../../provider-utils/awscloudformation/utils/rds-secrets/database-secrets';
import { writeSchemaFile } from '../../provider-utils/awscloudformation/utils/graphql-schema-utils';

const subcommand = 'generate-schema';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  const apiName = getAppSyncAPIName();
  const apiResourceDir = getAPIResourceDir(apiName);

  // proceed if there are any existing imported Relational Data Sources
  const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);
  if(fs.existsSync(pathToSchemaFile)) {
    // read and validate the RDS connection parameters
    const config: $TSAny = await readGlobalAmplifyInput(context, pathToSchemaFile);
    // ensure that the required database connection details exist
    await validateInputConfig(context, config);

    // read and validate the RDS connection secrets
    let secretsExistInParameterStore = true;
    let secrets = await getExistingConnectionSecrets(context, config.database);
    if(!secrets) {
      secrets = await getDBUserSecretsWalkthrough(context, config.database);
      secretsExistInParameterStore = false;
    }
    config['username'] = secrets?.username;
    config['password'] = secrets?.password;
    
    // Establish the connection
    let adapter: DataSourceAdapter;
    let schema: Schema;
    switch(config.engine) {
      case ImportedRDSType.MYSQL:
        adapter = new MySQLDataSourceAdapter(config);
        schema = new Schema(new Engine('MySQL'));
        break;
      default:
        printer.error('Only MySQL Data Source is supported.');
    }
    
    try {
      await adapter.initialize();
    } catch(error) {
      printer.error('Failed to connect to the specified RDS Data Source. Check the connection details in the schema and re-try. Use "amplify api update-environment-variables" to update the user credentials.');
      console.log(error?.message);
      throw(error);      
    };

    // If connection is successful, store the secrets in parameter store
    if(!secretsExistInParameterStore) {
      await storeConnectionSecrets(context, config.database, secrets);
    }

    const models = await adapter.getModels();
    adapter.cleanup();
    models.forEach(m => schema.addModel(m));

    const schemaString = generateGraphQLSchema(schema);
    writeSchemaFile(pathToSchemaFile, schemaString);

    if(_.isEmpty(schemaString)) {
      printer.warn('If your schema file is empty, it is likely that your database has no tables.');
    }
    printer.info(`Successfully imported the schema definition for ${config.database} database into ${pathToSchemaFile}`);
  }
  else {
    printer.info('No imported Data Sources to Generate GraphQL Schema.');
  }
};

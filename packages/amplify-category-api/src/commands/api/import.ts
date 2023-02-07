import { $TSContext } from 'amplify-cli-core';
import { printer } from 'amplify-prompts';
import * as path from 'path';
import fs from 'fs-extra';
import { importAppSyncAPIWalkthrough, writeDefaultGraphQLSchema } from '../../provider-utils/awscloudformation/service-walkthroughs/import-appsync-api-walkthrough';
import { RDS_SCHEMA_FILE_NAME } from '@aws-amplify/graphql-transformer-core';
import { getAPIResourceDir } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';

const subcommand = 'import';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  const importAppSyncAPIWalkInputs = await importAppSyncAPIWalkthrough(context);

  // ensure imported API resource artifacts are created
  const apiResourceDir = getAPIResourceDir(importAppSyncAPIWalkInputs.apiName);
  fs.ensureDirSync(apiResourceDir);

  const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);
  await writeDefaultGraphQLSchema(context, pathToSchemaFile, importAppSyncAPIWalkInputs.dataSourceType);

  // print next steps
  printer.info(`Update the database connection details in the file at ${pathToSchemaFile}.`);
  printer.info('Run "amplify api generate-schema" to fetch the schema.');
};

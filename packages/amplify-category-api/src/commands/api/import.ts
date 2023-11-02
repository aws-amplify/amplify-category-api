import * as path from 'path';
import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import fs from 'fs-extra';
import { RDS_SCHEMA_FILE_NAME, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { importAppSyncAPIWalkthrough } from '../../provider-utils/awscloudformation/service-walkthroughs/import-appsync-api-walkthrough';
import { getAPIResourceDir } from '../../provider-utils/awscloudformation/utils/amplify-meta-utils';
import { writeSchemaFile, generateRDSSchema } from '../../provider-utils/awscloudformation/utils/graphql-schema-utils';
import { PREVIEW_BANNER } from '../../category-constants';

const subcommand = 'import';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  printer.warn(PREVIEW_BANNER);
  // const importAppSyncAPIWalkInputs = await importAppSyncAPIWalkthrough(context);
  // console.log(JSON.stringify(importAppSyncAPIWalkInputs, null, 2));
  const importAppSyncAPIWalkInputs = {
    apiName: 'rdsauthpg',
    dataSourceConfig: {
      engine: 'postgres' as ImportedRDSType,
      database: 'testdb',
      host: 'database-pg.cdsc49uwsz3f.us-east-1.rds.amazonaws.com',
      port: 5432,
      username: 'postgres',
      password: 'KyYe4ZwqGi9Wc-*kPLLbx-',
    },
  };

  if (importAppSyncAPIWalkInputs?.dataSourceConfig) {
    // ensure imported API resource artifacts are created
    const apiResourceDir = getAPIResourceDir(importAppSyncAPIWalkInputs.apiName);
    fs.ensureDirSync(apiResourceDir);

    const pathToSchemaFile = path.join(apiResourceDir, RDS_SCHEMA_FILE_NAME);
    const schemaString = await generateRDSSchema(context, importAppSyncAPIWalkInputs.dataSourceConfig, pathToSchemaFile);
    writeSchemaFile(pathToSchemaFile, schemaString);

    // print next steps
    printer.info(`Successfully imported the database schema into ${pathToSchemaFile}.`);
  }
};

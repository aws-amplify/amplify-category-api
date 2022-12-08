import { $TSAny, $TSContext, AmplifyCategories, pathManager, stateManager } from 'amplify-cli-core';
import { printer } from 'amplify-prompts';
import * as path from 'path';
import fs from 'fs-extra';
import { MySQLDataSourceAdapter, generateGraphQLSchema, Schema, Engine } from '@aws-amplify/graphql-schema-generator';
const subcommand = 'import';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  const apiResourceDir = getResourceDir();

  if (!apiResourceDir) {
    throw new Error("No API Resource found.");
  }

  const config = await readConfigFile(apiResourceDir);

  // TODO: Change this to a factory method once we support multiple RDS engines
  const adapter = new MySQLDataSourceAdapter(config);
  await adapter.initialize();
  const models = await adapter.getModels();
  adapter.cleanup();

  const schema = new Schema(new Engine('MySQL'));
  models.forEach(m => schema.addModel(m));

  const schemaString = generateGraphQLSchema(schema);
  writeSchemaFile(apiResourceDir, schemaString);

  printer.info('Successfully imported the database schema.');
};

const getResourceDir = () => {
  const apiNames = Object.entries(stateManager.getMeta()?.api || {})
    .filter(([_, apiResource]) => (apiResource as $TSAny).service === 'AppSync')
    .map(([name]) => name);
  if (apiNames.length === 0) {
    printer.info(
      'No GraphQL API configured in the project.',
    );
    return;
  }
  if (apiNames.length > 1) {
    // this condition should never hit as we have upstream defensive logic to prevent multiple GraphQL APIs. But just to cover all the bases
    printer.error(
      'You have multiple GraphQL APIs in the project. Only one GraphQL API is allowed per project. Run `amplify remove api` to remove an API.',
    );
    return;
  }
  const apiName = apiNames[0];
  const apiResourceDir = path.join(pathManager.getBackendDirPath(), AmplifyCategories.API, apiName);
  return apiResourceDir;
};

// TODO: Move the file handling to amplify-cli-core

const readConfigFile = async (apiResourceDir: string) => {
  const configFilePath = path.join(apiResourceDir, 'rds.env');
  return fs.readJSON(configFilePath);
};

const writeSchemaFile = async (apiResourceDir: string, schema: string) => {
  const schemaFilePath = path.join(apiResourceDir, 'schema.rds.graphql');
  fs.writeFileSync(schemaFilePath, schema);
};

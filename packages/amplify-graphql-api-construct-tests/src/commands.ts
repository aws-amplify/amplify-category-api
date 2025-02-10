import * as path from 'path';
import * as fs from 'fs';
import { copySync, moveSync, readFileSync, writeFileSync } from 'fs-extra';
import {
  addApiWithoutSchema,
  amplifyPush,
  getProjectMeta,
  getScriptRunnerPath,
  initJSProjectWithProfile,
  nspawn as spawn,
  sleep,
  updateApiSchema,
} from 'amplify-category-api-e2e-core';
import { DynamoDBClient, DeleteTableCommand, ListTablesCommand, UpdateTableCommand } from '@aws-sdk/client-dynamodb';

/**
 * Retrieve the path to the `npx` executable for interacting with the aws-cdk cli.
 * @returns the local `npx` executable path.
 */
const getNpxPath = (): string => (process.platform === 'win32' ? getScriptRunnerPath().replace('node.exe', 'npx.cmd') : 'npx');

export type CdkConstruct = 'GraphqlApi' | 'Data';

const cdkConstructToPackagedConstructDirectory: Record<CdkConstruct, string> = {
  GraphqlApi: path.join(__dirname, '..', '..', 'amplify-graphql-api-construct', 'dist', 'js'),
  Data: path.join(__dirname, '..', '..', 'amplify-data-construct', 'dist', 'js'),
};

/**
 * Try and retrieve the locally packaged construct path, and throw an error if not found.
 * @returns path to the packaged construct for testing.
 */
const getPackagedConstructPath = (cdkConstruct: CdkConstruct): string => {
  const packagedConstructDirectory = cdkConstructToPackagedConstructDirectory[cdkConstruct];
  const packagedConstructTarballs = fs.readdirSync(packagedConstructDirectory).filter((fileName) => fileName.match(/\.tgz/));
  if (packagedConstructTarballs.length !== 1) {
    throw new Error('Construct packaged tarball not found');
  }
  return path.join(packagedConstructDirectory, packagedConstructTarballs[0]);
};

/**
 * Copy the backend snapshot into the generated app location.
 */
const copyTemplateDirectory = (projectPath: string, templatePath: string): void => {
  const binDir = path.join(projectPath, 'bin');
  copySync(templatePath, binDir, { overwrite: true });
  moveSync(path.join(binDir, 'app.ts'), path.join(binDir, `${path.basename(projectPath)}.ts`), { overwrite: true });
};

/**
 * Adds additional values to cdk context persisted in cdk.json file.
 */
const appendToCDKContext = (projectPath: string, additionalContext: Record<string, string>): void => {
  const cdkJsonPath = path.join(projectPath, 'cdk.json');
  const cdkJson = JSON.parse(readFileSync(cdkJsonPath, 'utf-8'));
  if (!cdkJson.context) {
    cdkJson.context = {};
  }
  Object.entries(additionalContext).forEach(([contextKey, contextValue]) => {
    cdkJson.context[contextKey] = contextValue;
  });
  writeFileSync(cdkJsonPath, JSON.stringify(cdkJson, null, 2));
};

export type InitCDKProjectProps = {
  construct?: CdkConstruct;
  cdkContext?: Record<string, string>;
  cdkVersion?: string;
  additionalDependencies?: Array<string>;
};

/**
 * Initialize a CDK project in the cwd using a reference backend `app.ts` file, and optional cdkVersion specified.
 * @param cwd the directory to initialize the CDK project in
 * @param templatePath path to the project to overwrite the cdk sample code with
 * @param props additional properties to configure the test app setup.
 * @returns a promise which resolves to the stack name
 */
export const initCDKProject = async (cwd: string, templatePath: string, props?: InitCDKProjectProps): Promise<string> => {
  const { cdkVersion = '2.177.0', additionalDependencies = [] } = props ?? {};

  await spawn(getNpxPath(), ['cdk', 'init', 'app', '--language', 'typescript'], {
    cwd,
    stripColors: true,
    // npx cdk does not work on verdaccio
    env: {
      npm_config_registry: 'https://registry.npmjs.org/',
    },
  })
    .sendYes()
    .runAsync();

  if (props?.cdkContext) {
    appendToCDKContext(cwd, props.cdkContext);
  }

  copyTemplateDirectory(cwd, templatePath);

  const deps = [getPackagedConstructPath(props?.construct ?? 'GraphqlApi'), `aws-cdk-lib@${cdkVersion}`, ...additionalDependencies];
  await spawn('npm', ['install', ...deps], { cwd, stripColors: true }).runAsync();

  return JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')).name.replace(/_/g, '-');
};

export type CdkDeployProps = {
  /**
   * Amount of time to wait with no output from CDK before failing.
   */
  timeoutMs?: number;

  /**
   * Amount of time to wait after deployment before returning. This allows time for certain resources to propagate and finalize.
   */
  postDeployWaitMs?: number;
};

/**
 * Execute `cdk deploy` on the project to push to the cloud.
 * @param cwd the cwd of the cdk project
 * @param option additional option to pass into the deployment
 * @returns the generated outputs file as a JSON object
 */
export const cdkDeploy = async (cwd: string, option: string, props?: CdkDeployProps): Promise<any> => {
  // The CodegenAssets BucketDeployment resource takes a while. Set the timeout to 10m account for that. (Note that this is the "no output
  // timeout"--the overall deployment is still allowed to take longer than 10m)
  const noOutputTimeout = props?.timeoutMs ?? 10 * 60 * 1000;
  const commandOptions = {
    cwd,
    stripColors: true,
    // npx cdk does not work on verdaccio
    env: { npm_config_registry: 'https://registry.npmjs.org/' },
    noOutputTimeout,
  };

  await spawn(
    getNpxPath(),
    ['cdk', 'deploy', '--outputs-file', 'outputs.json', '--require-approval', 'never', option],
    commandOptions,
  ).runAsync();

  if (props?.postDeployWaitMs) {
    console.log(`Waiting for ${props.postDeployWaitMs} ms to let resources propagate and finalize`);
    await sleep(props.postDeployWaitMs);
  }

  return JSON.parse(readFileSync(path.join(cwd, 'outputs.json'), 'utf8'));
};

/**
 * Execute `cdk destroy` in the project directory to tear down test stacks.
 * @param cwd the directory of the cdk project
 * @param option option to pass into the destroy command, e.g. the stack name.
 * @returns a promise which resolves after teardown of the stack
 */
export const cdkDestroy = async (cwd: string, option: string): Promise<void> => {
  return spawn(getNpxPath(), ['cdk', 'destroy', '--force', option], { cwd, stripColors: true }).runAsync();
};

/**
 * Helper function to update the cdk app code by a given directory path containing the new `app.ts`
 * @param cwd cdk app project root
 * @param templatePath updated cdk app code directory path. The new `app.ts` should be defined under this directory
 */
export const updateCDKAppWithTemplate = (cwd: string, templatePath: string): void => {
  const binDir = path.join(cwd, 'bin');
  copySync(templatePath, binDir, { overwrite: true });
  moveSync(path.join(binDir, 'app.ts'), path.join(binDir, `${path.basename(cwd)}.ts`), { overwrite: true });
};

/**
 * Helper function to create a gen 1 project with for migration.
 *
 * @param name project name
 * @param projRoot project root directory
 * @param schema schema file to use
 */
export const createGen1ProjectForMigration = async (
  name: string,
  projRoot: string,
  schema: string,
): Promise<{
  GraphQLAPIEndpointOutput: string;
  GraphQLAPIKeyOutput: string;
  DataSourceMappingOutput: string;
}> => {
  await initJSProjectWithProfile(projRoot, { name });
  await addApiWithoutSchema(projRoot, { transformerVersion: 2 });
  await updateApiSchema(projRoot, name, schema);
  await amplifyPush(projRoot);

  // The test should do a second push after enabling the feature flag to start the migration
  // TODO: GEN1_GEN2_MIGRATION
  // The Gen 1 CLI has not released this feature flag yet
  // In the meantime, manually create the data source mapping
  // restore this block when the feature flag is released
  // Start block
  /*
  addFeatureFlag(projRoot, 'graphqltransformer', 'enablegen2migration', true);
  await amplifyPushForce(projRoot);
  */
  // End block

  const meta = getProjectMeta(projRoot);
  const { output } = meta.api[name];
  const {
    GraphQLAPIEndpointOutput,
    GraphQLAPIKeyOutput,
    GraphQLAPIIdOutput,
    // TODO: GEN1_GEN2_MIGRATION
    // get DataSourceMappingOutput from output when feature flag is released
    // uncomment the line below
    // DataSourceMappingOutput,
  } = output;

  // TODO: GEN1_GEN2_MIGRATION
  // Construct the DataSourceMappingOutput with the AWS SDK
  // Remove this block when the feature flag is released
  // Start block
  const client = new DynamoDBClient({ region: process.env.CLI_REGION || 'us-west-2' });
  const tables = [];
  let ExclusiveStartTableName;
  do {
    const command = new ListTablesCommand({ ExclusiveStartTableName });
    const response = await client.send(command);
    ExclusiveStartTableName = response.LastEvaluatedTableName;
    tables.push(...response.TableNames);
  } while (ExclusiveStartTableName);
  const tableNameMapping = tables
    // filter all tables by the API ID
    .filter((tableName) => tableName.includes(GraphQLAPIIdOutput))
    // extract the model name from the table name and create the mapping
    .map((tableName) => [tableName.match(/(^.*?)-/)[1], tableName]);
  const DataSourceMappingOutput = JSON.stringify(Object.fromEntries(tableNameMapping));
  // End block

  return {
    GraphQLAPIEndpointOutput,
    GraphQLAPIKeyOutput,
    DataSourceMappingOutput,
  };
};

/**
 * Helper function to delete DDB tables.
 * Used to delete tables set to retain on delete.
 * @param tableNames table names to delete
 */
export const deleteDDBTables = async (tableNames: string[]): Promise<void> => {
  const client = new DynamoDBClient({ region: process.env.CLI_REGION || 'us-west-2' });
  // disable deletion protection before deleting the tables
  await Promise.allSettled(
    tableNames.map((tableName) => client.send(new UpdateTableCommand({ TableName: tableName, DeletionProtectionEnabled: false }))),
  );
  await Promise.allSettled(tableNames.map((tableName) => client.send(new DeleteTableCommand({ TableName: tableName }))));
};

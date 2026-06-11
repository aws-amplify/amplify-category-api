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
  addFeatureFlag,
  amplifyPushForce,
} from 'amplify-category-api-e2e-core';
import { DynamoDBClient, DeleteTableCommand, ListTablesCommand, UpdateTableCommand } from '@aws-sdk/client-dynamodb';
import { assertStackCanBeUpdated } from './cdk-deploy-preflight';

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

const getPackagedConstructDependencies = (cdkConstruct: CdkConstruct): Array<string> =>
  cdkConstruct === 'Data'
    ? [getPackagedConstructPath('GraphqlApi'), getPackagedConstructPath('Data')]
    : [getPackagedConstructPath('GraphqlApi')];

/**
 * Copy the backend snapshot into the generated app location.
 */
const copyTemplateDirectory = (projectPath: string, templatePath: string): void => {
  const binDir = path.join(projectPath, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
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

const writeMinimalCDKProjectFiles = (projectPath: string): void => {
  const projectName = path.basename(projectPath);
  writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(
      {
        name: projectName,
        version: '0.1.0',
        bin: {
          [projectName]: `bin/${projectName}.js`,
        },
        scripts: {
          cdk: 'cdk',
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    path.join(projectPath, 'cdk.json'),
    JSON.stringify(
      {
        app: `npx ts-node --prefer-ts-exts bin/${projectName}.ts`,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['es2020'],
          declaration: true,
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitThis: true,
          alwaysStrict: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          noImplicitReturns: true,
          noFallthroughCasesInSwitch: false,
          inlineSourceMap: true,
          inlineSources: true,
          experimentalDecorators: true,
          strictPropertyInitialization: false,
          typeRoots: ['./node_modules/@types'],
        },
        exclude: ['node_modules', 'cdk.out'],
      },
      null,
      2,
    ),
  );
};

/**
 * Initialize a CDK project in the cwd using a reference backend `app.ts` file, and optional cdkVersion specified.
 * @param cwd the directory to initialize the CDK project in
 * @param templatePath path to the project to overwrite the cdk sample code with
 * @param props additional properties to configure the test app setup.
 * @returns a promise which resolves to the stack name
 */
export const initCDKProject = async (cwd: string, templatePath: string, props?: InitCDKProjectProps): Promise<string> => {
  const { cdkVersion = '2.224.0', additionalDependencies = [] } = props ?? {};

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

  const deps = [...getPackagedConstructDependencies(props?.construct ?? 'GraphqlApi'), `aws-cdk-lib@${cdkVersion}`, ...additionalDependencies];
  await spawn('npm', ['install', ...deps], { cwd, stripColors: true }).runAsync();

  return JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')).name.replace(/_/g, '-');
};

/**
 * Initialize a minimal CDK project without running `cdk init`.
 * @param cwd the directory to initialize the CDK project in
 * @param templatePath path to the project to overwrite the cdk sample code with
 * @param props additional properties to configure the test app setup.
 * @returns a promise which resolves to the stack name
 */
export const initMinimalCDKProject = async (cwd: string, templatePath: string, props?: InitCDKProjectProps): Promise<string> => {
  const { cdkVersion = '2.224.0', additionalDependencies = [] } = props ?? {};

  writeMinimalCDKProjectFiles(cwd);

  if (props?.cdkContext) {
    appendToCDKContext(cwd, props.cdkContext);
  }

  copyTemplateDirectory(cwd, templatePath);

  const deps = [
    ...getPackagedConstructDependencies(props?.construct ?? 'GraphqlApi'),
    'aws-cdk@2.1126.0',
    `aws-cdk-lib@${cdkVersion}`,
    'constructs@10.3.0',
    'source-map-support@0.5.21',
    'ts-node@8.10.2',
    'typescript@5.8.3',
    '@types/node@24.0.0',
    ...additionalDependencies,
  ];
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
  // The CodegenAssets BucketDeployment resource takes a while. Set the timeout to 15m account for that. (Note that this is the "no output
  // timeout"--the overall deployment is still allowed to take longer than 15m)
  const noOutputTimeout = props?.timeoutMs ?? 15 * 60 * 1000;
  const commandOptions = {
    cwd,
    stripColors: true,
    // npx cdk does not work on verdaccio
    env: { npm_config_registry: 'https://registry.npmjs.org/' },
    noOutputTimeout,
  };
  await assertStackCanBeUpdated(resolveDeployStackName(cwd, option));

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
 * Execute `cdk synth` on the project.
 * @param cwd the cwd of the cdk project
 * @param option additional option to pass into the synth command
 * @returns the generated cdk.out path
 */
export const cdkSynth = async (cwd: string, option = '--all'): Promise<string> => {
  await spawn(getNpxPath(), ['cdk', 'synth', option, '--quiet'], {
    cwd,
    stripColors: true,
    env: { npm_config_registry: 'https://registry.npmjs.org/' },
    noOutputTimeout: 15 * 60 * 1000,
  }).runAsync();

  return path.join(cwd, 'cdk.out');
};

const resolveDeployStackName = (cwd: string, option: string): string => {
  if (option && !option.startsWith('-')) {
    return option;
  }
  return JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')).name.replace(/_/g, '-');
};

/**
 * Execute `cdk destroy` in the project directory to tear down test stacks.
 * @param cwd the directory of the cdk project
 * @param option option to pass into the destroy command, e.g. the stack name.
 * @returns a promise which resolves after teardown of the stack
 */
export const cdkDestroy = async (cwd: string, option: string): Promise<void> => {
  return spawn(getNpxPath(), ['cdk', 'destroy', '--force', option], { cwd, stripColors: true, noOutputTimeout: 15 * 60 * 1000 }).runAsync();
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

  addFeatureFlag(projRoot, 'graphqltransformer', 'enablegen2migration', true);
  await amplifyPushForce(projRoot);

  const meta = getProjectMeta(projRoot);
  const { output } = meta.api[name];

  const { GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput, DataSourceMappingOutput } = output;

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
  // deletion protection is enabled for migrated tables
  // disable deletion protection to teardown the tests
  await Promise.allSettled(
    tableNames.map((tableName) => client.send(new UpdateTableCommand({ TableName: tableName, DeletionProtectionEnabled: false }))),
  );
  await Promise.allSettled(tableNames.map((tableName) => client.send(new DeleteTableCommand({ TableName: tableName }))));
};

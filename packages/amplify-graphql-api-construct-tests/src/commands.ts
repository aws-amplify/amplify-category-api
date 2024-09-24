import * as path from 'path';
import * as fs from 'fs';
import { copySync, moveSync, readFileSync, writeFileSync } from 'fs-extra';
import { getScriptRunnerPath, sleep, nspawn as spawn } from 'amplify-category-api-e2e-core';

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
  const { cdkVersion = '2.158.0', additionalDependencies = [] } = props ?? {};

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
  // This prevents us from maintaining a separate CDK account bootstrap process as we add support for new accounts, regions.
  // Checks and succeeds early (a no-op) if the account-region combination is already bootstrapped.
  await spawn(getNpxPath(), ['cdk', 'bootstrap'], commandOptions).runAsync();

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

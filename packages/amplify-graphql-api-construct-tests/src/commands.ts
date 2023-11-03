import * as path from 'path';
import * as fs from 'fs';
import { copySync, moveSync, readFileSync } from 'fs-extra';
import { getScriptRunnerPath, nspawn as spawn } from 'amplify-category-api-e2e-core';

/**
 * Retrieve the path to the `npx` executable for interacting with the aws-cdk cli.
 * @returns the local `npx` executable path.
 */
const getNpxPath = (): string => (process.platform === 'win32' ? getScriptRunnerPath().replace('node.exe', 'npx.cmd') : 'npx');

/**
 * Try and retrieve the locally packaged construct path, and throw an error if not found.
 * @returns path to the packaged construct for testing.
 */
const getPackagedConstructPath = (): string => {
  const packagedConstructDirectory = path.join(__dirname, '..', '..', 'amplify-graphql-api-construct', 'dist', 'js');
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

export type InitCDKProjectProps = {
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
  const { cdkVersion = '2.80.0', additionalDependencies = [] } = props ?? {};

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

  copyTemplateDirectory(cwd, templatePath);

  const deps = [getPackagedConstructPath(), `aws-cdk-lib@${cdkVersion}`, ...additionalDependencies];
  await spawn('npm', ['install', ...deps], { cwd, stripColors: true }).runAsync();

  return JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')).name.replace(/_/g, '-');
};

/**
 * Execute `cdk deploy` on the project to push to the cloud.
 * @param cwd the cwd of the cdk project
 * @param option additional option to pass into the deployment
 * @returns the generated outputs file as a JSON object
 */
export const cdkDeploy = async (cwd: string, option: string): Promise<any> => {
  await spawn(getNpxPath(), ['cdk', 'deploy', '--outputs-file', 'outputs.json', '--require-approval', 'never', option], {
    cwd,
    stripColors: true,
    // npx cdk does not work on verdaccio
    env: { npm_config_registry: 'https://registry.npmjs.org/' },
  }).runAsync();

  return JSON.parse(readFileSync(path.join(cwd, 'outputs.json'), 'utf8'));
};

/**
 * Execute `cdk destroy` in the project directory to tear down test stacks.
 * @param cwd the directory of the cdk project
 * @param option option to pass into the destroy command, e.g. the stack name.
 * @returns a promise which resolves after teardown of the stack
 */
export const cdkDestroy = async (cwd: string, option: string): Promise<void> => {
  return spawn(getNpxPath(), ['cdk', 'destroy', option], { cwd, stripColors: true }).sendYes().runAsync();
};

/**
 * Execute `cdk destroy --force [...options]` to tear down test stacks.
 *
 * Adding this as a replacement for cdkDestroy. If it works in other tests, we'll replace the implementation of cdkDestroy and remove this
 * function
 * @param cwd the directory of the cdk project
 * @param options an array of additional options to pass into the `cdk destroy` command, e.g. the stack name.
 * @returns a promise which resolves after teardown of the stack
 */
export const cdkDestroyForce = async (cwd: string, ...options: string[]): Promise<void> => {
  return spawn(getNpxPath(), ['cdk', 'destroy', '--force', ...options], { cwd, stripColors: true }).runAsync();
};

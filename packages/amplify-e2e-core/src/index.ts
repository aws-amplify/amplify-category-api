import * as os from 'os';
import * as path from 'path';
import { spawnSync, execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as ini from 'ini';

import { v4 as uuid } from 'uuid';
import { pathManager } from '@aws-amplify/amplify-cli-core';
import { gt } from 'semver';
import { sleep } from '.';

export * from './configure';
export * from './init';
export * from './utils';
export * from './categories';
export { addFeatureFlag } from './utils/feature-flags';
export * from './cli-version-controller';

declare global {
  namespace NodeJS {
    interface Global {
      getRandomId: () => string;
    }
  }
}

const amplifyTestsDir = 'amplify-e2e-tests';

export function getCLIPath(testingWithLatestCodebase = false) {
  if (!testingWithLatestCodebase) {
    if (process.env.AMPLIFY_PATH && fs.existsSync(process.env.AMPLIFY_PATH)) {
      console.log('Resolving CLI path to AMPLIFY_PATH:', process.env.AMPLIFY_PATH);
      return process.env.AMPLIFY_PATH;
    }
    console.log('Resolving CLI path to present executable:', process.platform === 'win32' ? 'amplify.exe' : 'amplify');
    return process.platform === 'win32' ? 'amplify.exe' : 'amplify';
  }
  const amplifyScriptPath = path.join(__dirname, '..', '..', '..', 'node_modules', 'amplify-cli-internal', 'bin', 'amplify');
  console.log('Resolving CLI Path to source code:', amplifyScriptPath);
  return amplifyScriptPath;
}

export function isTestingWithLatestCodebase(scriptRunnerPath) {
  return scriptRunnerPath === process.execPath;
}

export function getScriptRunnerPath(testingWithLatestCodebase = false) {
  if (!testingWithLatestCodebase) {
    return process.platform === 'win32' ? 'node.exe' : 'exec';
  }

  // nodejs executable
  return process.execPath;
}

export function getNpmPath() {
  let npmPath = 'npm';
  if (process.platform === 'win32') {
    npmPath = getScriptRunnerPath().replace('node.exe', 'npm.cmd');
  }
  return npmPath;
}

export function isCI(): boolean {
  return !!(process.env.CI && process.env.CODEBUILD);
}

export function injectSessionToken(profileName: string) {
  const credentialsContents = ini.parse(fs.readFileSync(pathManager.getAWSCredentialsFilePath()).toString());
  credentialsContents[profileName] = credentialsContents[profileName] || {};
  credentialsContents[profileName].aws_session_token = process.env.AWS_SESSION_TOKEN;
  fs.writeFileSync(pathManager.getAWSCredentialsFilePath(), ini.stringify(credentialsContents));
}

/**
 * Execute an `npm install` in the given directory in a child process.
 *
 * @param cwd
 */
export function npmInstall(cwd: string) {
  spawnSync('npm', ['install'], { cwd });
}

/**
 * Run tests in a child process.
 *
 * @param cwd
 */
export function npmTest(cwd: string) {
  spawnSync('npm', ['test'], { cwd });
}

/**
 * Install the global `amplify` command.
 *
 * @param version
 */
export async function installAmplifyCLI(version: string = 'latest') {
  spawnSync('npm', ['install', '-g', `@aws-amplify/cli@${version}`], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  console.log('SETTING PATH:');
  if (gt(version, '10.0.0')) {
    process.env.AMPLIFY_PATH =
      process.platform === 'win32'
        ? path.join(os.homedir(), '.amplify', 'bin', 'amplify')
        : path.join(os.homedir(), '.amplify', 'bin', 'amplify');
  } else {
    process.env.AMPLIFY_PATH =
      process.platform === 'win32'
        ? path.join(os.homedir(), '..', '..', 'Program` Files', 'nodejs', 'node_modules', '@aws-amplify', 'cli', 'bin', 'amplify')
        : path.join(os.homedir(), '.npm-global', 'bin', 'amplify');
  }

  console.log('PATH SET:', process.env.AMPLIFY_PATH);
}

/**
 * Creates a folder in a temp directory for into which app code can be written. Intended for e2e's
 * to perform app build-out and deployment.
 *
 * By default, this also sleeps for a random interval between 0 and 3 minutes. Helps to prevent concurrent
 * e2e tests from running `amplify init` and other `amplify` commands concurrently and hitting service limits.
 *
 * To disable this sleep, run with environment variable `SKIP_CREATE_PROJECT_DIR_INITIAL_DELAY=true`.
 *
 * @param projectName Any name, ideally one that identifies the test app. E.g., "conversation".
 * @param prefix Prefix/Directory under which the project will be created. Defauls to OS temp directory.
 * @returns The created directory path.
 */
export const createNewProjectDir = async (
  projectName: string,
  prefix = path.join(fs.realpathSync(os.tmpdir()), amplifyTestsDir),
): Promise<string> => {
  const currentHash = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
  let projectDir;
  do {
    const randomId = await global.getRandomId();
    projectDir = path.join(prefix, `${projectName}_${currentHash}_${randomId}`);
  } while (fs.existsSync(projectDir));

  fs.ensureDirSync(projectDir);

  if (!process.env.SKIP_CREATE_PROJECT_DIR_INITIAL_DELAY) {
    const initialDelay = Math.floor(Math.random() * 180 * 1000); // between 0 to 3 min
    console.log(`Waiting for ${initialDelay} ms`);
    await sleep(initialDelay);
  }

  console.log(`projectDir: ${projectDir}`);
  return projectDir;
};

/**
 * Creates a temp directory in the operating system's default temp location.
 *
 * @returns The directory path.
 */
export const createTempDir = () => {
  const osTempDir = fs.realpathSync(os.tmpdir());
  const tempProjectDir = path.join(osTempDir, amplifyTestsDir, uuid());

  fs.mkdirsSync(tempProjectDir);

  return tempProjectDir;
};

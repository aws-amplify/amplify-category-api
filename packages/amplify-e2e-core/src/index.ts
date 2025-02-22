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

  console.log('\n[DEBUG] Inspecting directory structure from root:');
  
  // Get the absolute path
  const amplifyScriptPath = path.join(__dirname, '..', '..', '..', 'node_modules', 'amplify-cli-internal', 'bin', 'amplify');
  const absolutePath = path.resolve(amplifyScriptPath);
  
  // Split the path into components
  const pathParts = absolutePath.split(path.sep).filter(Boolean);
  
  // Build up the path piece by piece from root and inspect each level
  let currentPath = process.platform === 'win32' ? 'C:\\' : '/'; // Start at root
  console.log(`[DEBUG] Root (${currentPath}):`);
  try {
    const rootContents = fs.readdirSync(currentPath);
    console.log('[DEBUG]   Contents:', rootContents);
  } catch (err) {
    console.log('[DEBUG]   ⚠️ Cannot read root directory:', err.message);
  }

  // Inspect each level of the path
  for (const part of pathParts) {
    currentPath = path.join(currentPath, part);
    console.log(`\n[DEBUG] ${part} (${currentPath}):`);
    
    try {
      if (fs.existsSync(currentPath)) {
        const contents = fs.readdirSync(currentPath);
        console.log('[DEBUG]   ✓ Directory exists');
        console.log('[DEBUG]   Contents:', contents);
      } else {
        console.log('[DEBUG]   ✗ Directory does not exist');
      }
    } catch (err) {
      console.log('[DEBUG]   ⚠️ Cannot read directory:', err.message);
    }
  }

  console.log('\n[DEBUG] Final path check:');
  console.log('[DEBUG] Expected path:', amplifyScriptPath);
  console.log('[DEBUG] Absolute path:', absolutePath);
  console.log('[DEBUG] Path exists:', fs.existsSync(absolutePath) ? '✓' : '✗');
  
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

export function npmInstall(cwd: string) {
  spawnSync('npm', ['install'], { cwd });
}

export function npmTest(cwd: string) {
  spawnSync('npm', ['test'], { cwd });
}

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
    // createProjectDir(..) is something that nearly every test uses
    // Commands like 'init' would collide with each other if they occurred too close to one another.
    // Especially for nexpect output waiting
    // This makes it a perfect candidate for staggering test start times
    const initialDelay = Math.floor(Math.random() * 180 * 1000); // between 0 to 3 min
    console.log(`Waiting for ${initialDelay} ms`);
    await sleep(initialDelay);
  }

  console.log(`projectDir: ${projectDir}`);
  return projectDir;
};

export const createTempDir = () => {
  const osTempDir = fs.realpathSync(os.tmpdir());
  const tempProjectDir = path.join(osTempDir, amplifyTestsDir, uuid());

  fs.mkdirsSync(tempProjectDir);

  return tempProjectDir;
};

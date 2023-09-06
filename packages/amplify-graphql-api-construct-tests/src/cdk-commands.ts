import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import * as fsn from 'fs';
import * as fs from 'fs-extra';
import { sleep } from './sleep';
import * as rimraf from 'rimraf';
import { nspawn as spawn } from './nexpect';

const amplifyTestsDir = 'amplify-e2e-tests';

export const createNewProjectDir = async (
  projectName: string,
  prefix = path.join(fsn.realpathSync(os.tmpdir()), amplifyTestsDir),
): Promise<string> => {
  const currentHash = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
  let projectDir;
  do {
    const randomId = await global.getRandomId();
    projectDir = path.join(prefix, `${projectName}_${currentHash}_${randomId}`);
  } while (fsn.existsSync(projectDir));

  fs.ensureDirSync(projectDir);
  // createProjectDir(..) is something that nearly every test uses
  // Commands like 'init' would collide with each other if they occurred too close to one another.
  // Especially for nexpect output waiting
  // This makes it a perfect candidate for staggering test start times
  const initialDelay = Math.floor(Math.random() * 180 * 1000); // between 0 to 3 min
  await sleep(initialDelay);
  console.log(projectDir);
  return projectDir;
};

export const deleteProjectDir = (root: string): void => rimraf.sync(root);

export const initCDKProject = (cwd: string, templatePath: string): Promise<string> => {
  return new Promise<void>((resolve, reject) => {
    spawn(getNpxPath(), ['cdk', 'init', 'app', '--language', 'typescript'], {
      cwd,
      stripColors: true,
      // npx cdk does not work on verdaccio
      env: {
        npm_config_registry: 'https://registry.npmjs.org/',
      },
    })
      .sendConfirmYes()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  })
    .then(() => {
      const binDir = path.join(cwd, 'bin');
      fs.copySync(templatePath, binDir, { overwrite: true });
      fs.moveSync(path.join(binDir, 'app.ts'), path.join(binDir, `${path.basename(cwd)}.ts`), { overwrite: true });
    })
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          // change to official package
          spawn('npm', ['install', '--save-dev', '@aws-amplify/graphql-construct-alpha'], { cwd, stripColors: true }).run((err: Error) => {
            if (!err) {
              resolve();
            } else {
              reject(err);
            }
          });
        }),
    )
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          // override dep version from cdk init
          spawn('npm', ['install', '--save', 'aws-cdk-lib@2.80.0'], { cwd, stripColors: true }).run((err: Error) => {
            if (!err) {
              resolve();
            } else {
              reject(err);
            }
          });
        }),
    )
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          // add esbuild for bundling in NodeJsFunction
          spawn('npm', ['install', '--save', 'esbuild'], { cwd, stripColors: true }).run((err: Error) => {
            if (!err) {
              resolve();
            } else {
              reject(err);
            }
          });
        }),
    )
    .then(() => fs.readFile(path.join(cwd, 'package.json'), 'utf8'))
    .then((packageJson) => JSON.parse(packageJson).name.replace(/_/g, '-'));
};

export const cdkDeploy = (cwd: string, option: string): Promise<any> => {
  return new Promise<void>((resolve, reject) => {
    spawn(getNpxPath(), ['cdk', 'deploy', '--outputs-file', 'outputs.json', '--require-approval', 'never', option], {
      cwd,
      stripColors: true,
      // npx cdk does not work on verdaccio
      env: {
        npm_config_registry: 'https://registry.npmjs.org/',
      },
    }).run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  })
    .then(() => fs.readFile(path.join(cwd, 'outputs.json'), 'utf8'))
    .then(JSON.parse);
};

export const cdkDestroy = (cwd: string, option: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    spawn(getNpxPath(), ['cdk', 'destroy', option], { cwd, stripColors: true })
      .sendConfirmYes()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
};

const getNpxPath = (): string => (process.platform === 'win32' ? 'npx.cmd' : 'npx');

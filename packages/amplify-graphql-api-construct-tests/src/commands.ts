import * as path from 'path';
import * as fs from 'fs';
import { copySync, moveSync, readFileSync } from 'fs-extra';
import { getScriptRunnerPath, nspawn as spawn } from 'amplify-category-api-e2e-core';

const getNpxPath = (): string => (process.platform === 'win32' ? getScriptRunnerPath().replace('node.exe', 'npx.cmd') : 'npx');

export const initCDKProject = async (cwd: string, templatePath: string, cdkVersion = '2.80.0'): Promise<string> => {
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

  const binDir = path.join(cwd, 'bin');
  copySync(templatePath, binDir, { overwrite: true });
  moveSync(path.join(binDir, 'app.ts'), path.join(binDir, `${path.basename(cwd)}.ts`), { overwrite: true });

  // Consume the locally packaged library for testing.
  const packagedConstructDirectory = path.join(__dirname, '..', '..', 'amplify-graphql-api-construct', 'dist', 'js');
  const packagedConstructTarballs = fs.readdirSync(packagedConstructDirectory).filter((fileName) => fileName.match(/\.tgz/));
  if (packagedConstructTarballs.length !== 1) {
    throw new Error('Construct packaged tarball not found');
  }
  const packagedConstructPath = path.join(packagedConstructDirectory, packagedConstructTarballs[0]);

  const devDependencies = [packagedConstructPath];

  const runtimeDependencies = [`aws-cdk-lib@${cdkVersion}`, 'esbuild'];

  await spawn('npm', ['install', '--save-dev', ...devDependencies], { cwd, stripColors: true }).runAsync();
  await spawn('npm', ['install', '--save', ...runtimeDependencies], { cwd, stripColors: true }).runAsync();

  return JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')).name.replace(/_/g, '-');
};

export const cdkDeploy = async (cwd: string, option: string): Promise<any> => {
  await spawn(getNpxPath(), ['cdk', 'deploy', '--outputs-file', 'outputs.json', '--require-approval', 'never', option], {
    cwd,
    stripColors: true,
    // npx cdk does not work on verdaccio
    env: { npm_config_registry: 'https://registry.npmjs.org/' },
  }).runAsync();

  return JSON.parse(readFileSync(path.join(cwd, 'outputs.json'), 'utf8'));
};

export const cdkDestroy = async (cwd: string, option: string): Promise<void> => {
  return spawn(getNpxPath(), ['cdk', 'destroy', option], { cwd, stripColors: true }).sendYes().runAsync();
};

import path from 'path';
import fs from 'fs-extra';
import { nspawn as spawn } from 'amplify-category-api-e2e-core';

const jsonServerRootDirectory = path.join(__dirname, '..', 'resources', 'jsonServer');

const npm_config_registry = 'https://registry.npmjs.org/';
const local_registry = 'http://localhost:4873/';

const env = {
  npm_config_registry,
};

export const deployJsonServer = async (): Promise<{
  apiUrl: string;
}> => {
  await setYarnRegistry(jsonServerRootDirectory, npm_config_registry);
  const jsonServerLambdaDirectory = path.join(jsonServerRootDirectory, 'src-server');
  const outputValuesFile = path.join(jsonServerRootDirectory, 'cdk.out', 'outputs.json');

  await spawn('yarn', [], {
    cwd: jsonServerRootDirectory,
    stripColors: true,
    env,
  }).runAsync();

  await spawn('yarn', [], {
    cwd: jsonServerLambdaDirectory,
    stripColors: true,
    env,
  }).runAsync();

  await spawn('npx', ['cdk', 'bootstrap', '--require-approval', 'never'], {
    cwd: jsonServerRootDirectory,
    stripColors: true,
    env,
  }).runAsync();

  await spawn('npx', ['cdk', 'deploy', '--outputsFile', outputValuesFile, '--require-approval', 'never'], {
    cwd: jsonServerRootDirectory,
    stripColors: true,
    env,
  }).runAsync();

  if (!fs.existsSync(outputValuesFile)) {
    throw new Error(`CDK deploy failed, output values file: ${outputValuesFile} does not exist`);
  }

  const outputsContent = fs.readFileSync(outputValuesFile).toString();
  const outputValues = JSON.parse(outputsContent);

  const stackOutputs = outputValues['JsonMockStack'];
  const apiUrl = stackOutputs[Object.keys(stackOutputs)[0]];
  await setYarnRegistry(jsonServerRootDirectory, local_registry);

  return {
    apiUrl,
  };
};

export const destroyJsonServer = async (): Promise<void> => {
  await setYarnRegistry(jsonServerRootDirectory, npm_config_registry);
  await spawn('npx', ['cdk', 'destroy', '--force'], {
    cwd: jsonServerRootDirectory,
    stripColors: true,
    env,
  }).runAsync();
  await setYarnRegistry(jsonServerRootDirectory, local_registry);
};

const setYarnRegistry = async (cwd: string, registry: string): Promise<void> => {
  await spawn('yarn', ['config', 'set', 'registry', registry], {
    cwd,
    stripColors: true,
  });
};

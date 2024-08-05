import { FeatureFlags, JSONUtilities, pathManager, stateManager } from '@aws-amplify/amplify-cli-core';
import * as fs from 'fs-extra';
import _ from 'lodash';
import * as path from 'path';

export const backupLocation = (resourceDir: string) => path.join(resourceDir, '.migration-config-backup');

export const updateTransformerVersion = async (env?: string): Promise<void> => {
  const mutation = (cliJSON: any) => {
    _.set(cliJSON, ['features', 'graphqltransformer', 'useexperimentalpipelinedtransformer'], true);
    _.set(cliJSON, ['features', 'graphqltransformer', 'transformerversion'], 2);
    _.set(cliJSON, ['features', 'graphqltransformer', 'suppressschemamigrationprompt'], true);
    _.set(cliJSON, ['features', 'codegen', 'useappsyncmodelgenplugin'], true);
  };
  await mutateCliJsonFile(mutation, env);
};

export const backupCliJson = async (resourceDir: string, env?: string): Promise<void> => {
  const cliJson = getCliJsonFile(env);
  const backupPath = path.join(backupLocation(resourceDir), 'cli.json');
  JSONUtilities.writeJson(backupPath, cliJson);
};

export const revertTransformerVersion = async (resourceDir: string, env?: string): Promise<void> => {
  const backupPath = path.join(backupLocation(resourceDir), 'cli.json');
  const backupJson: any = JSONUtilities.readJson(backupPath);
  const mutation = (cliJson: any) => {
    _.set(cliJson, ['features'], backupJson['features']);
  };
  await mutateCliJsonFile(mutation, env);
  fs.removeSync(backupLocation(resourceDir));
};

const mutateCliJsonFile = async (mutation: (cliObj: any) => void, env?: string): Promise<void> => {
  const projectPath = pathManager.findProjectRoot() ?? process.cwd();
  let envCLI = true;
  let cliJSON;
  if (env) {
    cliJSON = stateManager.getCLIJSON(projectPath, env, { throwIfNotExist: false });
  }
  if (!cliJSON) {
    envCLI = false;
    cliJSON = stateManager.getCLIJSON(projectPath);
  }
  mutation(cliJSON);
  stateManager.setCLIJSON(projectPath, cliJSON, envCLI ? env : undefined);
  await FeatureFlags.reloadValues();
};

const getCliJsonFile = (env?: string): Promise<any> => {
  const projectPath = pathManager.findProjectRoot() ?? process.cwd();
  let cliJSON;
  if (env) {
    cliJSON = stateManager.getCLIJSON(projectPath, env, { throwIfNotExist: false });
  }
  return cliJSON ?? stateManager.getCLIJSON(projectPath);
};

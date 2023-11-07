import { AddApiRequest, UpdateApiRequest } from 'amplify-headless-interface';
import execa, { ExecaChildProcess } from 'execa';
import { getCLIPath } from '..';

export const addHeadlessApi = async (cwd: string, request: AddApiRequest, settings?: any): Promise<ExecaChildProcess<string>> => {
  const allowDestructiveUpdates = settings?.allowDestructiveUpdates ?? false;
  const testingWithLatestCodebase = settings?.testingWithLatestCodebase ?? false;
  return executeHeadlessCommand(cwd, 'api', 'add', request, true, allowDestructiveUpdates, {
    testingWithLatestCodebase: testingWithLatestCodebase,
  });
};

export const updateHeadlessApi = async (
  cwd: string,
  request: UpdateApiRequest,
  allowDestructiveUpdates?: boolean,
  settings = { testingWithLatestCodebase: false },
): Promise<ExecaChildProcess<string>> => {
  return await executeHeadlessCommand(cwd, 'api', 'update', request, undefined, allowDestructiveUpdates, settings);
};

export const removeHeadlessApi = async (cwd: string, apiName: string): Promise<ExecaChildProcess<string>> => {
  return await headlessRemoveResource(cwd, 'api', apiName);
};

const headlessRemoveResource = async (cwd: string, category: string, resourceName: string): Promise<ExecaChildProcess<string>> => {
  return await execa(getCLIPath(), ['remove', category, resourceName, '--yes'], { cwd });
};

const executeHeadlessCommand = async (
  cwd: string,
  category: string,
  operation: string,
  request: AddApiRequest | UpdateApiRequest,
  reject: boolean = true,
  allowDestructiveUpdates: boolean = false,
  settings = { testingWithLatestCodebase: false },
) => {
  const args = [operation, category, '--headless'];
  if (allowDestructiveUpdates) {
    args.push('--allow-destructive-graphql-schema-updates');
  }
  const cliPath = getCLIPath(settings.testingWithLatestCodebase);
  return await execa(cliPath, args, { input: JSON.stringify(request), cwd, reject });
};

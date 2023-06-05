import {
  AddApiRequest,
  AddAuthRequest,
  AddStorageRequest,
  AddGeoRequest,
  ImportAuthRequest,
  ImportStorageRequest,
  RemoveStorageRequest,
  UpdateApiRequest,
  UpdateAuthRequest,
  UpdateStorageRequest,
  UpdateGeoRequest,
} from 'amplify-headless-interface';
import execa, { ExecaChildProcess } from 'execa';
import { getCLIPath } from '..';

/**
 *
 * @param cwd
 * @param request
 * @param settings
 */
export const addHeadlessApi = async (cwd: string, request: AddApiRequest, settings?: any): Promise<ExecaChildProcess<string>> => {
  const allowDestructiveUpdates = settings?.allowDestructiveUpdates ?? false;
  const testingWithLatestCodebase = settings?.testingWithLatestCodebase ?? false;
  return executeHeadlessCommand(cwd, 'api', 'add', request, true, allowDestructiveUpdates, {
    testingWithLatestCodebase,
  });
};

/**
 *
 * @param cwd
 * @param request
 * @param allowDestructiveUpdates
 * @param settings
 */
export const updateHeadlessApi = async (
  cwd: string,
  request: UpdateApiRequest,
  allowDestructiveUpdates?: boolean,
  settings = { testingWithLatestCodebase: false },
): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'api', 'update', request, undefined, allowDestructiveUpdates, settings);

/**
 *
 * @param cwd
 * @param apiName
 */
export const removeHeadlessApi = async (cwd: string, apiName: string): Promise<ExecaChildProcess<string>> => await headlessRemoveResource(cwd, 'api', apiName);

/**
 *
 * @param cwd
 * @param request
 */
export const addHeadlessAuth = async (cwd: string, request: AddAuthRequest): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'auth', 'add', request);

/**
 *
 * @param cwd
 * @param request
 * @param settings
 */
export const updateHeadlessAuth = async (cwd: string, request: UpdateAuthRequest, settings?: any): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'auth', 'update', request, true, false, settings);

/**
 *
 * @param cwd
 * @param authName
 */
export const removeHeadlessAuth = async (cwd: string, authName: string): Promise<ExecaChildProcess<string>> => await headlessRemoveResource(cwd, 'auth', authName);

/**
 *
 * @param cwd
 * @param request
 */
export const headlessAuthImport = async (cwd: string, request: ImportAuthRequest): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'auth', 'import', request);

/**
 *
 * @param cwd
 * @param request
 */
export const addHeadlessStorage = async (cwd: string, request: AddStorageRequest): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'storage', 'add', request);

/**
 *
 * @param cwd
 * @param request
 * @param reject
 */
export const importHeadlessStorage = async (
  cwd: string,
  request: ImportStorageRequest,
  reject = true,
): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'storage', 'import', request, reject);

/**
 *
 * @param cwd
 * @param request
 */
export const removeHeadlessStorage = async (cwd: string, request: RemoveStorageRequest): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'storage', 'remove', request);

/**
 *
 * @param cwd
 * @param request
 */
export const updateHeadlessStorage = async (cwd: string, request: UpdateStorageRequest): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'storage', 'update', request);

/**
 *
 * @param cwd
 * @param request
 */
export const addHeadlessGeo = async (cwd: string, request: AddGeoRequest): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'geo', 'add', request);

/**
 *
 * @param cwd
 * @param request
 */
export const updateHeadlessGeo = async (cwd: string, request: UpdateGeoRequest): Promise<ExecaChildProcess<string>> => await executeHeadlessCommand(cwd, 'geo', 'update', request);

const headlessRemoveResource = async (cwd: string, category: string, resourceName: string): Promise<ExecaChildProcess<string>> => await execa(getCLIPath(), ['remove', category, resourceName, '--yes'], { cwd });

const executeHeadlessCommand = async (
  cwd: string,
  category: string,
  operation: string,
  request: AnyHeadlessRequest,
  reject = true,
  allowDestructiveUpdates = false,
  settings = { testingWithLatestCodebase: false },
) => {
  const args = [operation, category, '--headless'];
  if (allowDestructiveUpdates) {
    args.push('--allow-destructive-graphql-schema-updates');
  }
  const cliPath = getCLIPath(settings.testingWithLatestCodebase);
  return await execa(cliPath, args, { input: JSON.stringify(request), cwd, reject });
};

type AnyHeadlessRequest =
  | AddApiRequest
  | UpdateApiRequest
  | AddAuthRequest
  | UpdateAuthRequest
  | ImportAuthRequest
  | AddStorageRequest
  | ImportStorageRequest
  | RemoveStorageRequest
  | UpdateStorageRequest
  | AddGeoRequest
  | UpdateGeoRequest;

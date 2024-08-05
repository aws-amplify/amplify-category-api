import { config } from 'dotenv';
import * as path from 'path';
import * as rimraf from 'rimraf';
import { v4 as uuid } from 'uuid';

export * from './add-ci-tags';
export * from './api';
export * from './appsync';
export * from './credentials-rotator';
export * from './getAppId';
export * from './headless';
export * from './nexpect';
export * from './overrides';
export * from './projectMeta';
export * from './rds';
export * from './readJsonFile';
export * from './request';
export * from './retrier';
export * from './sdk-calls';
export * from './selectors';
export * from './sleep';
export * from './transformConfig';

// run dotenv config to update env variable
config();

// eslint-disable-next-line spellcheck/spell-checker
export const TEST_PROFILE_NAME = 'amplify-integ-test-user';

export function deleteProjectDir(root: string) {
  rimraf.sync(root);
}

export function deleteAmplifyDir(root: string) {
  rimraf.sync(path.join(root, 'amplify'));
}

/**
 * Generate random resource name
 * @returns generated resource name
 */
export function generateRandomShortId(): string {
  return uuid().split('-')[0];
}

import * as path from 'path';
import * as rimraf from 'rimraf';
import { config } from 'dotenv';
import { v4 as uuid } from 'uuid';

export * from './add-ci-tags';
export * from './api';
export * from './appsync';
export * from './getAppId';
export * from './headless';
export * from './nexpect';
export * from './overrides';
export * from './projectMeta';
export * from './readJsonFile';
export * from './request';
export * from './retrier';
export * from './sdk-calls';
export * from './selectors';
export * from './sleep';
export * from './transformConfig';
export * from './rds';
export * from './credentials-rotator';
export * from './test-regions';

// run dotenv config to update env variable
config();

// eslint-disable-next-line spellcheck/spell-checker
export const TEST_PROFILE_NAME = 'amplify-integ-test-user';

export function deleteProjectDir(root: string) {
  if (process.env.SKIP_DELETE) {
    console.warn(`🌋 Did not delete project dir: ${root}`);
    return;
  }
  // Retry up to 3 times with 1s delay to handle Node 22 + rimraf v3
  // ENOTEMPTY race conditions during parallel test cleanup
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      rimraf.sync(root);
      return;
    } catch (err: any) {
      if (attempt === 2) {
        console.error(`Failed to delete project dir after 3 attempts: ${root}`, err.message);
        return; // Don't throw — cleanup failures shouldn't fail tests
      }
      // Wait 1s before retry
      const { execSync } = require('child_process');
      execSync('sleep 1');
    }
  }
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

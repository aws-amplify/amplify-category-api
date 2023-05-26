import { amplifyConfigureBeforeOrAtV10_7, amplifyConfigure as configure, isCI, installAmplifyCLI, injectSessionToken } from 'amplify-category-api-e2e-core';
import { existsSync } from 'fs-extra';
import semver from 'semver';

/*
 *  Migration tests must be run without publishing to local registry
 *  so that the CLI used initally is the installed version and the
 *  tested CLI is the codebase (bin/amplify)
 */

async function setupAmplify(version: string = 'latest') {
  // install CLI to be used for migration test initial project.
  await installAmplifyCLI(version);

  console.log("INSTALLED CLI:", version);
  if (isCI()) {
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error('Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    }
    const validSemver = semver.parse(version);
    if (!validSemver || semver.gt(version, '10.7.0')) {
      // version is either after 10.7 or it's a tag name like latest so use the current configure function
      await configure({
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        profileName: 'amplify-integ-test-user',
      });
    } else {
      // version is before 10.7 so use the previous config function
      await amplifyConfigureBeforeOrAtV10_7({
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        profileName: 'amplify-integ-test-user',
      });
    }
    if (process.env.AWS_SESSION_TOKEN) {
      injectSessionToken('amplify-integ-test-user');
    }
  } else {
    console.log('AWS Profile is already configured');
  }
}

process.nextTick(async () => {
  try {
    // check if cli version was passed to setup-profile
    if (process.argv.length > 2) {
      const cliVersion = process.argv[2];
      console.log('start')
      console.log(process.env.AMPLIFY_PATH)
      console.log(existsSync(process.env.AMPLIFY_PATH))
      await setupAmplify(cliVersion);
    } else {
      await setupAmplify();
    }
  } catch (e) {
    console.log(e.stack);
    process.exit(1);
  }
});

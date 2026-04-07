import { EOL } from 'os';
import {
  deleteProject,
  createNewProjectDir,
  deleteProjectDir,
  nspawn as spawn,
  getCLIPath,
  addCITags,
} from 'amplify-category-api-e2e-core';
import { testSchema } from '../schema-api-directives';

// schema-auth tests require extended timeout due to complex auth schema deployments
jest.setTimeout(2 * 60 * 60 * 1000); // 2 hours

const TAG = '[schema-auth-4]';

function ts(): string {
  return new Date().toISOString();
}

/**
 * Debug-instrumented version of initJSProjectWithProfile.
 * Logs timestamps for each prompt match so we can identify where the CLI hangs.
 */
function initJSProjectWithProfileDebug(cwd: string): Promise<void> {
  const s = {
    name: EOL,
    envName: 'integtest',
    editor: EOL,
    appType: EOL,
    framework: EOL,
    srcDir: EOL,
    distDir: EOL,
    buildCmd: EOL,
    startCmd: EOL,
    profileName: EOL,
  };

  const env = {
    CLI_DEV_INTERNAL_DISABLE_AMPLIFY_APP_CREATION: '1',
  };

  addCITags(cwd);

  // Enable verbose logging so all CLI output is captured to a file.
  // The nexpect runner writes to a temp file when this env var is set.
  process.env.VERBOSE_LOGGING_DO_NOT_USE_IN_CI_OR_YOU_WILL_BE_FIRED = '1';

  let stepIndex = 0;
  const waitLog = (label: string) => (data: string) => {
    stepIndex++;
    console.log(`${TAG} [${ts()}] Step ${stepIndex} MATCHED: "${label}" | data: ${JSON.stringify(data.substring(0, 200))}`);
  };

  console.log(`${TAG} [${ts()}] Starting init chain. cwd=${cwd}`);

  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(), ['init'], {
      cwd,
      stripColors: true,
      env,
      disableCIDetection: false,
      noOutputTimeout: 10 * 60 * 1000,
    })
      .wait('Do you want to continue with Amplify Gen 1?', waitLog('Do you want to continue with Amplify Gen 1?'))
      .sendConfirmYes()
      .wait('Why would you like to use Amplify Gen 1?', waitLog('Why would you like to use Amplify Gen 1?'))
      .sendCarriageReturn()
      .wait('Enter a name for the project', waitLog('Enter a name for the project'))
      .sendLine(s.name)
      .wait('Initialize the project with the above configuration?', waitLog('Initialize the project with the above configuration?'))
      .sendConfirmNo()
      .wait('Enter a name for the environment', waitLog('Enter a name for the environment'))
      .sendLine(s.envName)
      .wait('Choose your default editor:', waitLog('Choose your default editor:'))
      .sendLine(s.editor)
      .wait("Choose the type of app that you're building", waitLog("Choose the type of app that you're building"))
      .sendLine(s.appType)
      .wait('What javascript framework are you using', waitLog('What javascript framework are you using'))
      .sendLine(s.framework)
      .wait('Source Directory Path:', waitLog('Source Directory Path:'))
      .sendLine(s.srcDir)
      .wait('Distribution Directory Path:', waitLog('Distribution Directory Path:'))
      .sendLine(s.distDir)
      .wait('Build Command:', waitLog('Build Command:'))
      .sendLine(s.buildCmd)
      .wait('Start Command:', waitLog('Start Command:'))
      .sendCarriageReturn()
      .wait('Using default provider  awscloudformation', waitLog('Using default provider  awscloudformation'))
      .wait('Select the authentication method you want to use:', waitLog('Select the authentication method you want to use:'))
      .sendCarriageReturn()
      .wait('Please choose the profile you want to use', waitLog('Please choose the profile you want to use'))
      .sendLine(s.profileName)
      .wait('Help improve Amplify CLI', waitLog('Help improve Amplify CLI'))
      .sendYes()
      .wait(
        /Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/,
        waitLog('amplify add api completion message'),
      );

    chain.run((err: Error) => {
      // Clean up the verbose logging env var
      delete process.env.VERBOSE_LOGGING_DO_NOT_USE_IN_CI_OR_YOU_WILL_BE_FIRED;

      if (err) {
        console.error(`${TAG} [${ts()}] initJSProjectWithProfile FAILED after step ${stepIndex}. Error: ${err.message}`);
        reject(err);
      } else {
        console.log(`${TAG} [${ts()}] initJSProjectWithProfile completed successfully after ${stepIndex} steps.`);
        resolve();
      }
    });
  });
}

describe('api directives @auth batch 4', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await createNewProjectDir('auth4');
    console.log(`${TAG} [${ts()}] projectDir: ${projectDir}`);
    console.log(`${TAG} [${ts()}] Starting initJSProjectWithProfile`);

    await initJSProjectWithProfileDebug(projectDir);

    console.log(`${TAG} [${ts()}] beforeEach complete`);
  });

  afterEach(async () => {
    console.log(`${TAG} [${ts()}] Starting afterEach (deleteProject)`);
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
    console.log(`${TAG} [${ts()}] afterEach complete`);
  });

  it('auth public1', async () => {
    const testresult = await testSchema(projectDir, 'auth', 'public1');
    expect(testresult).toBeTruthy();
  });
});

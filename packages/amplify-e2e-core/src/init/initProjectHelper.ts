import { EOL } from 'os';
import { v4 as uuid } from 'uuid';
import {
  AmplifyClient,
  CreateAppCommand,
  CreateBackendEnvironmentCommand,
  ListBackendEnvironmentsCommand,
  paginateListApps,
} from '@aws-sdk/client-amplify';
import { nspawn as spawn, getCLIPath, singleSelect, addCITags } from '..';
import { KEY_DOWN_ARROW } from '../utils';
import { amplifyRegions } from '../configure';

/**
 * Name of the placeholder Amplify app that keeps an account/region eligible to run
 * Gen1 `amplify init`. Must match the name skipped by the e2e cleanup job.
 */
export const GEN1_DEPRECATION_BYPASS_APP_NAME = 'DoNotDeleteAppToBypassGen1Deprecation';

/**
 * Name of the backend environment created under the placeholder app. The Gen1
 * new-customer gate only passes when the app has at least one backend environment.
 */
export const GEN1_DEPRECATION_BYPASS_ENV_NAME = 'test';

const defaultSettings = {
  name: EOL,
  envName: 'integtest',
  editor: EOL,
  appType: EOL,
  framework: EOL,
  srcDir: EOL,
  distDir: EOL,
  buildCmd: EOL,
  startCmd: EOL,
  useProfile: EOL,
  profileName: EOL,
  region: process.env.CLI_REGION,
  local: false,
  disableAmplifyAppCreation: true,
  disableCIDetection: false,
  providerConfig: undefined,
  permissionsBoundaryArn: undefined,
};

export function initJSProjectWithProfile(cwd: string, settings?: Partial<typeof defaultSettings>): Promise<void> {
  const s = { ...defaultSettings, ...settings };
  let env;

  if (s.disableAmplifyAppCreation === true) {
    env = {
      CLI_DEV_INTERNAL_DISABLE_AMPLIFY_APP_CREATION: '1',
    };
  }

  addCITags(cwd);

  const cliArgs = ['init'];
  const providerConfigSpecified = !!s.providerConfig && typeof s.providerConfig === 'object';
  if (providerConfigSpecified) {
    cliArgs.push('--providers', JSON.stringify(s.providerConfig));
  }

  if (s.permissionsBoundaryArn) {
    cliArgs.push('--permissions-boundary', s.permissionsBoundaryArn);
  }

  if (s?.name?.length > 20) console.warn('Project names should not be longer than 20 characters. This may cause tests to break.');

  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(), cliArgs, {
      cwd,
      stripColors: true,
      env,
      disableCIDetection: s.disableCIDetection,
      noOutputTimeout: 10 * 60 * 1000,
    })
      .wait('Do you want to continue with Amplify Gen 1?')
      .sendConfirmYes()
      .wait('Why would you like to use Amplify Gen 1?')
      .sendCarriageReturn()
      .wait('Enter a name for the project')
      .sendLine(s.name)
      .wait('Initialize the project with the above configuration?')
      .sendConfirmNo()
      .wait('Enter a name for the environment')
      .sendLine(s.envName)
      .wait('Choose your default editor:')
      .sendLine(s.editor)
      .wait("Choose the type of app that you're building")
      .sendLine(s.appType)
      .wait('What javascript framework are you using')
      .sendLine(s.framework)
      .wait('Source Directory Path:')
      .sendLine(s.srcDir)
      .wait('Distribution Directory Path:')
      .sendLine(s.distDir)
      .wait('Build Command:')
      .sendLine(s.buildCmd)
      .wait('Start Command:')
      .sendCarriageReturn();

    if (!providerConfigSpecified) {
      chain
        .wait('Using default provider  awscloudformation')
        .wait('Select the authentication method you want to use:')
        .sendCarriageReturn()
        .wait('Please choose the profile you want to use')
        .sendLine(s.profileName);
    }

    chain
      .wait('Help improve Amplify CLI')
      .sendYes()
      .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
      .run((err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
  });
}

export function initAndroidProjectWithProfile(cwd: string, settings: Object): Promise<void> {
  const s = { ...defaultSettings, ...settings };

  addCITags(cwd);

  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['init'], {
      cwd,
      stripColors: true,
      env: {
        CLI_DEV_INTERNAL_DISABLE_AMPLIFY_APP_CREATION: '1',
      },
    })
      .wait('Do you want to continue with Amplify Gen 1?')
      .sendConfirmYes()
      .wait('Why would you like to use Amplify Gen 1?')
      .sendCarriageReturn()
      .wait('Enter a name for the project')
      .sendLine(s.name)
      .wait('Initialize the project with the above configuration?')
      .sendConfirmNo()
      .wait('Enter a name for the environment')
      .sendLine(s.envName)
      .wait('Choose your default editor:')
      .sendLine(s.editor)
      .wait("Choose the type of app that you're building")
      .sendLine('android')
      .wait('Where is your Res directory')
      .sendCarriageReturn()
      .wait('Select the authentication method you want to use:')
      .sendCarriageReturn()
      .wait('Please choose the profile you want to use')
      .sendLine(s.profileName)
      .wait('Help improve Amplify CLI')
      .sendYes()
      .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
      .run((err: Error) => {
        if (!err) {
          addCITags(cwd);

          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function createRandomName() {
  const length = 20;
  const regExp = new RegExp('-', 'g');
  return uuid().replace(regExp, '').substring(0, length);
}

export function initIosProjectWithProfile(cwd: string, settings: Object): Promise<void> {
  const s = { ...defaultSettings, ...settings };

  addCITags(cwd);

  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['init'], {
      cwd,
      stripColors: true,
      env: {
        CLI_DEV_INTERNAL_DISABLE_AMPLIFY_APP_CREATION: '1',
      },
    })
      .wait('Do you want to continue with Amplify Gen 1?')
      .sendConfirmYes()
      .wait('Why would you like to use Amplify Gen 1?')
      .sendCarriageReturn()
      .wait('Enter a name for the project')
      .sendLine(s.name)
      .wait('Initialize the project with the above configuration?')
      .sendConfirmNo()
      .wait('Enter a name for the environment')
      .sendLine(s.envName)
      .wait('Choose your default editor:')
      .sendLine(s.editor)
      .wait("Choose the type of app that you're building")
      .sendKeyDown(3)
      .sendCarriageReturn()
      .wait('Select the authentication method you want to use:')
      .sendCarriageReturn()
      .wait('Please choose the profile you want to use')
      .sendLine(s.profileName)
      .wait('Help improve Amplify CLI')
      .sendYes()
      .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
      .run((err: Error) => {
        if (!err) {
          addCITags(cwd);

          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function initFlutterProjectWithProfile(cwd: string, settings: Object): Promise<void> {
  const s = { ...defaultSettings, ...settings };

  addCITags(cwd);

  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(), ['init'], { cwd, stripColors: true })
      .wait('Do you want to continue with Amplify Gen 1?')
      .sendConfirmYes()
      .wait('Why would you like to use Amplify Gen 1?')
      .sendCarriageReturn()
      .wait('Enter a name for the project')
      .sendLine(s.name)
      .wait('Initialize the project with the above configuration?')
      .sendConfirmNo()
      .wait('Enter a name for the environment')
      .sendLine(s.envName)
      .wait('Choose your default editor:')
      .sendLine(s.editor)
      .wait("Choose the type of app that you're building")
      .sendKeyDown(2)
      .sendCarriageReturn()
      .wait('Where do you want to store your configuration file')
      .sendLine('./lib/')
      .wait('Using default provider  awscloudformation')
      .wait('Select the authentication method you want to use:')
      .sendCarriageReturn()
      .wait('Please choose the profile you want to use')
      .sendLine(s.profileName);

    singleSelect(chain, s.region, amplifyRegions);
    chain
      .wait('Help improve Amplify CLI')
      .sendYes()
      .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function initProjectWithAccessKey(
  cwd: string,
  settings: { accessKeyId: string; secretAccessKey: string; region?: string },
): Promise<void> {
  const s = { ...defaultSettings, ...settings };

  addCITags(cwd);

  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(), ['init'], {
      cwd,
      stripColors: true,
      env: {
        CLI_DEV_INTERNAL_DISABLE_AMPLIFY_APP_CREATION: '1',
      },
    })
      .wait('Do you want to continue with Amplify Gen 1?')
      .sendConfirmYes()
      .wait('Why would you like to use Amplify Gen 1?')
      .sendCarriageReturn()
      .wait('Enter a name for the project')
      .sendLine(s.name)
      .wait('Initialize the project with the above configuration?')
      .sendConfirmNo()
      .wait('Enter a name for the environment')
      .sendLine(s.envName)
      .wait('Choose your default editor:')
      .sendLine(s.editor)
      .wait("Choose the type of app that you're building")
      .sendLine(s.appType)
      .wait('What javascript framework are you using')
      .sendLine(s.framework)
      .wait('Source Directory Path:')
      .sendLine(s.srcDir)
      .wait('Distribution Directory Path:')
      .sendLine(s.distDir)
      .wait('Build Command:')
      .sendLine(s.buildCmd)
      .wait('Start Command:')
      .sendCarriageReturn()
      .wait('Using default provider  awscloudformation')
      .wait('Select the authentication method you want to use:')
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .pauseRecording()
      .wait('accessKeyId')
      .sendLine(s.accessKeyId)
      .wait('secretAccessKey')
      .sendLine(s.secretAccessKey)
      .resumeRecording()
      .wait('region');

    singleSelect(chain, s.region, amplifyRegions);

    chain
      .wait('Help improve Amplify CLI')
      .sendYes()
      .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

/**
 * Idempotently ensure the Gen1 deprecation-bypass placeholder app (and its backend
 * environment) exists in the given region, so that `amplify init` is not blocked by
 * the Gen1 new-customer restriction.
 *
 * Self-healing: safe to call at the start of every e2e shard. If the placeholder was
 * deleted by cleanup, it is recreated; if it already exists, this is a no-op. All
 * errors are swallowed and logged so a transient failure never fails the test run.
 *
 * @param region the AWS region to ensure the placeholder in (defaults to `process.env.CLI_REGION`)
 */
export async function ensureGen1PlaceholderApp(region: string | undefined = process.env.CLI_REGION): Promise<void> {
  if (!region) {
    console.log('[ensureGen1PlaceholderApp] No region provided (CLI_REGION unset); skipping placeholder app check.');
    return;
  }

  const client = new AmplifyClient({ region });

  try {
    let existingAppId: string | undefined;
    for await (const page of paginateListApps({ client }, {})) {
      const match = page.apps?.find((a) => a.name === GEN1_DEPRECATION_BYPASS_APP_NAME);
      if (match) {
        existingAppId = match.appId;
        break;
      }
    }

    let appId = existingAppId;
    if (!appId) {
      const createResponse = await client.send(new CreateAppCommand({ name: GEN1_DEPRECATION_BYPASS_APP_NAME }));
      appId = createResponse.app?.appId;
      if (!appId) {
        console.log('[ensureGen1PlaceholderApp] CreateApp returned no appId; skipping backend environment creation.');
        return;
      }
      console.log(`[ensureGen1PlaceholderApp] Created placeholder app ${GEN1_DEPRECATION_BYPASS_APP_NAME} (${appId}) in ${region}.`);
    }

    const backendEnvs = await client.send(new ListBackendEnvironmentsCommand({ appId, maxResults: 50 }));
    const hasEnv = backendEnvs.backendEnvironments?.some((e) => e.environmentName === GEN1_DEPRECATION_BYPASS_ENV_NAME);
    if (!hasEnv) {
      await client.send(new CreateBackendEnvironmentCommand({ appId, environmentName: GEN1_DEPRECATION_BYPASS_ENV_NAME }));
      console.log(
        `[ensureGen1PlaceholderApp] Created backend environment '${GEN1_DEPRECATION_BYPASS_ENV_NAME}' for app ${appId} in ${region}.`,
      );
    }
  } catch (e) {
    console.log(`[ensureGen1PlaceholderApp] Non-fatal error ensuring placeholder app in ${region}: ${(e as Error)?.message ?? e}`);
  }
}

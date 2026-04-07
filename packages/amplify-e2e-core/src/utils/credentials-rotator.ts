import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { fromContainerMetadata } from '@aws-sdk/credential-providers';
import * as ini from 'ini';
import * as fs from 'fs-extra';
import { pathManager } from '@aws-amplify/amplify-cli-core';
import { generateRandomShortId, TEST_PROFILE_NAME } from './index';

const DEFAULT_REGION = 'us-east-1';

/**
 * Ensures the test profile has a region set in ~/.aws/config.
 * This prevents the Amplify CLI from prompting for a region during `amplify init`,
 * which would cause the nexpect chain to hang.
 */
const ensureProfileRegion = async () => {
  const region = process.env.CLI_REGION || DEFAULT_REGION;
  const configFilePath = pathManager.getAWSConfigFilePath();

  await fs.ensureFile(configFilePath);
  const existingContent = (await fs.readFile(configFilePath)).toString();
  const configContents = existingContent.trim() ? ini.parse(existingContent) : {};

  // In ~/.aws/config, non-default profiles use "profile <name>" as the section key
  const profileKey = `profile ${TEST_PROFILE_NAME}`;
  configContents[profileKey] = configContents[profileKey] || {};
  configContents[profileKey].region = region;

  await fs.writeFile(configFilePath, ini.stringify(configContents));
};

const refreshCredentials = async (roleArn: string, useCurrentCreds: boolean = false) => {
  let credentials = undefined;
  if (!useCurrentCreds) {
    credentials = fromContainerMetadata();
  }
  const client = new STSClient({
    credentials,
  });
  const sessionName = `testSession${generateRandomShortId()}`;
  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: sessionName,
    DurationSeconds: 3600,
  });
  const response = await client.send(command);

  const profileName = TEST_PROFILE_NAME;
  const credentialsContents = ini.parse((await fs.readFile(pathManager.getAWSCredentialsFilePath())).toString());
  credentialsContents[profileName] = credentialsContents[profileName] || {};
  credentialsContents[profileName].aws_access_key_id = response.Credentials.AccessKeyId;
  credentialsContents[profileName].aws_secret_access_key = response.Credentials.SecretAccessKey;
  credentialsContents[profileName].aws_session_token = response.Credentials.SessionToken;
  process.env.AWS_ACCESS_KEY_ID = response.Credentials.AccessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = response.Credentials.SecretAccessKey;
  process.env.AWS_SESSION_TOKEN = response.Credentials.SessionToken;
  await fs.writeFile(pathManager.getAWSCredentialsFilePath(), ini.stringify(credentialsContents));
  await ensureProfileRegion();
};

/**
 * Refresh the parent account. If child account is available, refresh that as well.
 */
const tryRefreshCredentials = async (parentRoleArn: string, childRoleArn?: string) => {
  try {
    await refreshCredentials(parentRoleArn);
    if (childRoleArn) {
      await refreshCredentials(childRoleArn, true);
    }
    console.log('Test profile credentials refreshed');
  } catch (e) {
    console.error('Test profile credentials request failed');
    console.error(e);
  }
};

let isRotationBackgroundTaskAlreadyScheduled = false;
let credentialRefreshTimer: ReturnType<typeof setInterval> | undefined;

/**
 * Schedules a background task that attempts to refresh test account credentials
 * on given interval.
 *
 * No-op outside Amplify CI environment.
 *
 * No-op if a background task has already been scheduled.
 */
export const tryScheduleCredentialRefresh = () => {
  if (!process.env.CI || !process.env.TEST_ACCOUNT_ROLE || isRotationBackgroundTaskAlreadyScheduled) {
    return;
  }

  if (process.env.CHILD_ACCOUNT_ROLE) {
    // Attempts to refresh credentials in background every 10 minutes.
    credentialRefreshTimer = setInterval(() => {
      void tryRefreshCredentials(process.env.TEST_ACCOUNT_ROLE, process.env.CHILD_ACCOUNT_ROLE);
    }, 10 * 60 * 1000);
    credentialRefreshTimer.unref();

    console.log('Test profile credentials refresh was scheduled for child account');
  } else {
    // CDK tests and tests with USE_PARENT_ACCOUNT only use the parent account role.
    // Refresh the parent account credentials to prevent expiration during long-running tests.
    credentialRefreshTimer = setInterval(() => {
      void tryRefreshCredentials(process.env.TEST_ACCOUNT_ROLE);
    }, 10 * 60 * 1000);
    credentialRefreshTimer.unref();

    console.log('Test profile credentials refresh was scheduled for parent account');
  }

  isRotationBackgroundTaskAlreadyScheduled = true;
};

/**
 * Stops the credential refresh timer. Call this in afterAll to prevent
 * "Cannot log after tests are done" warnings from Jest.
 */
export const stopCredentialRefresh = () => {
  if (credentialRefreshTimer) {
    clearInterval(credentialRefreshTimer);
    credentialRefreshTimer = undefined;
  }
  isRotationBackgroundTaskAlreadyScheduled = false;
};

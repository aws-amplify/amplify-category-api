import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { fromContainerMetadata } from '@aws-sdk/credential-providers';
import * as ini from 'ini';
import * as fs from 'fs-extra';
import { pathManager } from '@aws-amplify/amplify-cli-core';
import { generateRandomShortId, TEST_PROFILE_NAME } from './index';

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
};

/**
 * Refresh the parent account
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

  if (process.env.USE_PARENT_ACCOUNT) {
    // Attempts to refresh credentials in background every 15 minutes.
    setInterval(() => {
      void tryRefreshCredentials(process.env.TEST_ACCOUNT_ROLE);
    }, 15 * 60 * 1000);

    console.log('Test profile credentials refresh was scheduled for parent account');
    return;
  } else if (process.env.CHILD_ACCOUNT_ROLE) {
    // Attempts to refresh credentials in background every 15 minutes.
    setInterval(() => {
      void tryRefreshCredentials(process.env.TEST_ACCOUNT_ROLE, process.env.CHILD_ACCOUNT_ROLE);
    }, 15 * 60 * 1000);

    console.log('Test profile credentials refresh was scheduled for child account');
  } else {
    throw new Error('Credentials rotator could not find any role to rotate credentials for');
  }

  isRotationBackgroundTaskAlreadyScheduled = true;
};

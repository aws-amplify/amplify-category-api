// Disabling as we're running from a ts-node context.
/* eslint-disable import/no-extraneous-dependencies */
import fetch from 'node-fetch';
import * as unzipper from 'unzipper';

const EMULATOR_URL = 'https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.zip';
const EMULATOR_DIR = 'emulator';

/**
 * Download the emulator file from s3, unzip, and persist all unzipped contents.
 */
const main = async (): Promise<void> => {
  const response = await fetch(EMULATOR_URL);
  if (!response.ok) throw new Error(`Unexpected error downloading the emulator: ${response.statusText}`);
  response.body.pipe(unzipper.Extract({ path: EMULATOR_DIR }));
};

main();

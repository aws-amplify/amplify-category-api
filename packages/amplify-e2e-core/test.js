// disable eslint rule for this file
/* eslint-disable */
const { fromNodeProviderChain } = require('@aws-sdk/credential-providers');
const fs = require('fs');
const path = require('path');

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const loadCredentials = async () => {
  const provider = fromNodeProviderChain({
    profile: 'test-profile',
  });

  try {
    const credentials = await provider();
    console.log(credentials);
  } catch (e) {
    console.error(e);
  }

  // log env var AWS_ACCESS_KEY_ID
  console.log('AWS_ACCESS_KEY_ID env var:', process.env.AWS_ACCESS_KEY_ID);
  // log env var AWS_SECRET_ACCESS_KEY
  console.log('AWS_SECRET_ACCESS_KEY env var:', process.env.AWS_SECRET_ACCESS_KEY);

  // log contents in ~/.aws/credentials
  const credentialsPath = path.join(process.env.HOME, '.aws', 'credentials');
  console.log('Contents in ~/.aws/credentials:');
  console.log(fs.readFileSync(credentialsPath, 'utf8'));
  // log contents in ~/.aws/config
  const configPath = path.join(process.env.HOME, '.aws', 'config');
  console.log('Contents in ~/.aws/config:');
  console.log(fs.readFileSync(configPath, 'utf8'));

  // log env var AWS_WEB_IDENTITY_TOKEN_FILE
  console.log('AWS_WEB_IDENTITY_TOKEN_FILE env var:', process.env.AWS_WEB_IDENTITY_TOKEN_FILE);
  // log env var AWS_ROLE_ARN
  console.log('AWS_ROLE_ARN env var:', process.env.AWS_ROLE_ARN);
  // log env var AWS_ROLE_SESSION_NAME
  console.log('AWS_ROLE_SESSION_NAME env var:', process.env.AWS_ROLE_SESSION_NAME);
};

void loadCredentials();

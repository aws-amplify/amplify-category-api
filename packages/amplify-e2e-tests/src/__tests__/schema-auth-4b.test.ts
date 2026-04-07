import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { initJSProjectWithProfile, deleteProject, createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { testSchema } from '../schema-api-directives';

// schema-auth tests require extended timeout due to complex auth schema deployments
jest.setTimeout(2 * 60 * 60 * 1000); // 2 hours

const TAG = '[DEBUG schema_auth_4b]';

function ts(): string {
  return new Date().toISOString();
}

function logEnvironment(): void {
  console.log(`${TAG} [${ts()}] === Environment Snapshot ===`);
  console.log(`${TAG} CLI_REGION=${process.env.CLI_REGION ?? '<unset>'}`);
  console.log(`${TAG} AWS_DEFAULT_REGION=${process.env.AWS_DEFAULT_REGION ?? '<unset>'}`);
  console.log(`${TAG} AWS_REGION=${process.env.AWS_REGION ?? '<unset>'}`);
  console.log(`${TAG} AWS_PROFILE=${process.env.AWS_PROFILE ?? '<unset>'}`);
  console.log(`${TAG} AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID ? '***set***' : '<unset>'}`);
  console.log(`${TAG} AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY ? '***set***' : '<unset>'}`);
  console.log(`${TAG} AWS_SESSION_TOKEN=${process.env.AWS_SESSION_TOKEN ? '***set***' : '<unset>'}`);

  const awsDir = path.join(os.homedir(), '.aws');
  const configPath = path.join(awsDir, 'config');
  const credentialsPath = path.join(awsDir, 'credentials');

  // Log ~/.aws/config
  if (fs.existsSync(configPath)) {
    const configContents = fs.readFileSync(configPath, 'utf-8');
    console.log(`${TAG} ~/.aws/config EXISTS (${configContents.length} bytes):`);
    console.log(`${TAG} --- config start ---`);
    console.log(configContents);
    console.log(`${TAG} --- config end ---`);

    // Check specifically for amplify-integ-test-user profile
    if (configContents.includes('amplify-integ-test-user')) {
      console.log(`${TAG} amplify-integ-test-user profile FOUND in config`);
    } else {
      console.log(`${TAG} amplify-integ-test-user profile NOT FOUND in config`);
    }
  } else {
    console.log(`${TAG} ~/.aws/config DOES NOT EXIST`);
  }

  // Log ~/.aws/credentials (mask secret keys)
  if (fs.existsSync(credentialsPath)) {
    const credContents = fs.readFileSync(credentialsPath, 'utf-8');
    const masked = credContents.replace(/(aws_secret_access_key\s*=\s*).+/gi, '$1***MASKED***');
    console.log(`${TAG} ~/.aws/credentials EXISTS (${credContents.length} bytes):`);
    console.log(`${TAG} --- credentials start ---`);
    console.log(masked);
    console.log(`${TAG} --- credentials end ---`);
  } else {
    console.log(`${TAG} ~/.aws/credentials DOES NOT EXIST`);
  }

  console.log(`${TAG} [${ts()}] === End Environment Snapshot ===`);
}

describe('api directives @auth batch 4b', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await createNewProjectDir('auth4b');
    console.log(`${TAG} [${ts()}] projectDir: ${projectDir}`);
    logEnvironment();
    console.log(`${TAG} [${ts()}] Starting initJSProjectWithProfile`);
    await initJSProjectWithProfile(projectDir, {});
    console.log(`${TAG} [${ts()}] initJSProjectWithProfile completed`);
  });

  afterEach(async () => {
    console.log(`${TAG} [${ts()}] Starting afterEach (deleteProject)`);
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
    console.log(`${TAG} [${ts()}] afterEach complete`);
  });

  it('auth private1', async () => {
    const testresult = await testSchema(projectDir, 'auth', 'private1');
    expect(testresult).toBeTruthy();
  });

  it('auth private2', async () => {
    const testresult = await testSchema(projectDir, 'auth', 'private2');
    expect(testresult).toBeTruthy();
  });
});

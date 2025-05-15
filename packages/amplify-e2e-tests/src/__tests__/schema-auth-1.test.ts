import { initJSProjectWithProfile, deleteProject, createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { testSchema } from '../schema-api-directives';

describe('api directives @auth batch 1', () => {
  let projectDir: string;

  beforeEach(async () => {
    console.log('beforeEach');
    console.log('process.env', process.env);
    console.log('process.env.AWS_PROFILE', process.env.AWS_PROFILE);
    console.log('process.env.AWS_ACCESS_KEY_ID', process.env.AWS_ACCESS_KEY_ID);
    projectDir = await createNewProjectDir('auth1');
    await initJSProjectWithProfile(projectDir, {});

    console.log('done with beforeEach');
  });

  afterEach(async () => {
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
  });

  it('auth owner1', async () => {
    const testresult = await testSchema(projectDir, 'auth', 'owner1');
    expect(testresult).toBeTruthy();
  });

  it('auth owner2', async () => {
    const testresult = await testSchema(projectDir, 'auth', 'owner2');
    expect(testresult).toBeTruthy();
  });
});

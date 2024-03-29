import { initJSProjectWithProfile, deleteProject, createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { testSchema } from '../schema-api-directives';

describe('api directives @auth batch 2', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await createNewProjectDir('auth12');
    await initJSProjectWithProfile(projectDir, {});
  });

  afterEach(async () => {
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
  });

  it('auth owner7', async () => {
    const testresult = await testSchema(projectDir, 'auth', 'owner7');
    expect(testresult).toBeTruthy();
  });
  it('auth ownerMultiAuthRules', async () => {
    const testresult = await testSchema(projectDir, 'auth', 'ownerMultiAuthRules');
    expect(testresult).toBeTruthy();
  });
});

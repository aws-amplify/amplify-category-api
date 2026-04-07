import { initJSProjectWithProfile, deleteProject, createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { testSchema } from '../schema-api-directives';

// schema-auth tests require extended timeout due to complex auth schema deployments
jest.setTimeout(2 * 60 * 60 * 1000); // 2 hours

describe('api directives @auth batch 4c', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await createNewProjectDir('auth4c');
    await initJSProjectWithProfile(projectDir, {});
  });

  afterEach(async () => {
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
  });

  it('auth public2', async () => {
    const testresult = await testSchema(projectDir, 'auth', 'public2');
    expect(testresult).toBeTruthy();
  });
});

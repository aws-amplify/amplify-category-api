import { initJSProjectWithProfile, deleteProject, createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { testSchema } from '../schema-api-directives';

// schema-auth tests require extended timeout due to complex auth schema deployments
jest.setTimeout(2 * 60 * 60 * 1000); // 2 hours

describe('api directives @auth batch 4', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await createNewProjectDir('auth4');
    await initJSProjectWithProfile(projectDir, {});
  });

  afterEach(async () => {
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
  });

  it('auth public1', async () => {
    const testresult = await testSchema(projectDir, 'auth', 'public1');
    expect(testresult).toBeTruthy();
  });
});

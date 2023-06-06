import { initJSProjectWithProfile, deleteProject, createNewProjectDir, deleteProjectDir, refreshCredentials } from 'amplify-category-api-e2e-core';
import { testSchema } from '../schema-api-directives';

describe('api directives @searchable', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await createNewProjectDir('searchable');
    await initJSProjectWithProfile(projectDir, {});
  });

  afterEach(async () => {
    const newCreds = refreshCredentials();
    await deleteProject(projectDir, newCreds);
    deleteProjectDir(projectDir);
  });

  it('searchable usage', async () => {
    const testresult = await testSchema(projectDir, 'searchable', 'usage');
    expect(testresult).toBeTruthy();
  });
});

import {
  initJSProjectWithProfile,
  deleteProject,
  createNewProjectDir,
  deleteProjectDir,
  tryScheduleCredentialRefresh,
} from 'amplify-category-api-e2e-core';
import { testSchema } from '../schema-api-directives';

describe('api directives @searchable', () => {
  let projectDir: string;

  beforeAll(() => {
    tryScheduleCredentialRefresh();
  });

  beforeEach(async () => {
    projectDir = await createNewProjectDir('searchable');
    await initJSProjectWithProfile(projectDir, {});
  });

  afterEach(async () => {
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
  });

  it('searchable usage', async () => {
    const testresult = await testSchema(projectDir, 'searchable', 'usage');
    expect(testresult).toBeTruthy();
  });
});

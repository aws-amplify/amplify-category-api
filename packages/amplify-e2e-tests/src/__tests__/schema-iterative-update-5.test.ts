import * as path from 'path';
import {
  createNewProjectDir,
  initJSProjectWithProfile,
  deleteProject,
  deleteProjectDir,
  addApiWithoutSchema,
  addFeatureFlag,
  amplifyPush,
  updateApiSchema,
  amplifyPushUpdate,
} from 'amplify-category-api-e2e-core';

describe('Schema iterative update - add sort key to primary key', () => {
  let projectDir: string;

  beforeAll(async () => {
    projectDir = await createNewProjectDir('schemaIterative');
    await initJSProjectWithProfile(projectDir, {
      name: 'iterativetest1',
    });

    addFeatureFlag(projectDir, 'graphqltransformer', 'enableiterativegsiupdates', true);
  });
  afterAll(async () => {
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
  });
  it('should error out when pushed without allowing destructive updates', async () => {
    const apiName = 'iterativetest1';

    const initialSchema = path.join('iterative-push', 'add-sort-to-primary-key', 'initial-schema.graphql');
    await addApiWithoutSchema(projectDir, { apiKeyExpirationDays: 7, transformerVersion: 2 });
    await updateApiSchema(projectDir, apiName, initialSchema);
    await amplifyPush(projectDir);

    const finalSchema = path.join('iterative-push', 'add-sort-to-primary-key', 'final-schema.graphql');
    await updateApiSchema(projectDir, apiName, finalSchema);
    await expect(amplifyPushUpdate(projectDir)).resolves.toThrowError();
  });
});

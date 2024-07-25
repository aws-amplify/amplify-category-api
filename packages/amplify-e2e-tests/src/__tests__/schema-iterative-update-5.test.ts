import {
  addApiWithoutSchema,
  addFeatureFlag,
  amplifyPush,
  amplifyPushUpdate,
  createNewProjectDir,
  deleteProject,
  deleteProjectDir,
  initJSProjectWithProfile,
  updateApiSchema,
} from 'amplify-category-api-e2e-core';
import * as path from 'path';

describe('Schema iterative update - sort key modifications', () => {
  let projectDir: string;

  beforeAll(async () => {
    projectDir = await createNewProjectDir('schemaIterative');
    await initJSProjectWithProfile(projectDir, {
      name: 'iterativetest5',
    });

    addFeatureFlag(projectDir, 'graphqltransformer', 'enableiterativegsiupdates', true);
  });
  afterAll(async () => {
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
  });

  it('should error out when sort key addition pushed without allowing destructive updates', async () => {
    const apiName = 'iterativetest5';

    const initialSchema = path.join('iterative-push', 'add-sort-to-primary-key', 'initial-schema.graphql');
    await addApiWithoutSchema(projectDir, { apiKeyExpirationDays: 7, transformerVersion: 2 });
    await updateApiSchema(projectDir, apiName, initialSchema);
    await amplifyPush(projectDir);

    const finalSchema = path.join('iterative-push', 'add-sort-to-primary-key', 'final-schema.graphql');
    await updateApiSchema(projectDir, apiName, finalSchema);
    await expect(amplifyPushUpdate(projectDir)).rejects.toBeTruthy();
  });

  it('should error out when sort key removal pushed without allowing destructive updates', async () => {
    const apiName = 'iterativetest5';

    const initialSchema = path.join('iterative-push', 'add-sort-to-primary-key', 'final-schema.graphql');
    await addApiWithoutSchema(projectDir, { apiKeyExpirationDays: 7, transformerVersion: 2 });
    await updateApiSchema(projectDir, apiName, initialSchema);
    await amplifyPush(projectDir);

    const finalSchema = path.join('iterative-push', 'add-sort-to-primary-key', 'initial-schema.graphql');
    await updateApiSchema(projectDir, apiName, finalSchema);
    await expect(amplifyPushUpdate(projectDir)).rejects.toBeTruthy();
  });
});

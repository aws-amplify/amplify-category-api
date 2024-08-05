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
  updateApiWithMultiAuth,
} from 'amplify-category-api-e2e-core';
import * as path from 'path';

describe('Schema iterative update - add new @models and @key', () => {
  let projectDir: string;

  beforeAll(async () => {
    projectDir = await createNewProjectDir('schemaIterative');
    await initJSProjectWithProfile(projectDir, {});

    addFeatureFlag(projectDir, 'graphqltransformer', 'enableiterativegsiupdates', true);
  });
  afterAll(async () => {
    await deleteProject(projectDir);
    deleteProjectDir(projectDir);
  });
  it('should support adding a new @key to existing @model and adding multiple @models with iam @auth enabled', async () => {
    const apiName = 'addkeyandmodel';

    const initialSchema = path.join('iterative-push', 'add-one-key-multiple-models', 'initial-schema.graphql');
    await addApiWithoutSchema(projectDir, { apiName, transformerVersion: 1 });
    await updateApiWithMultiAuth(projectDir, {});
    updateApiSchema(projectDir, apiName, initialSchema);
    await amplifyPush(projectDir);

    const finalSchema = path.join('iterative-push', 'add-one-key-multiple-models', 'final-schema.graphql');
    updateApiSchema(projectDir, apiName, finalSchema);
    await amplifyPushUpdate(projectDir);
  });
});

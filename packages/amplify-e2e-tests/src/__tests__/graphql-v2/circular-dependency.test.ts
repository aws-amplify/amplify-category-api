import { addApi, addApiWithoutSchema, amplifyPush, cancelAmplifyMockApi, createNewProjectDir, deleteProject, deleteProjectDir, initJSProjectWithProfile, updateApiSchema } from "amplify-category-api-e2e-core";
import { existsSync } from "fs-extra";
import path from 'path';
import { addCodegen } from "../../codegen/add";

describe('Circurlar dependency tests', () => {
  let projRoot: string;
  let projFolderName: string;
  beforeEach(async () => {
    projFolderName = 'circulardependency';
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
  });
  it('should not have circular dependency error when mocking api with a specific GraphQL schema', async () => {
    const projName = 'circulardependency';
    await initJSProjectWithProfile(projRoot, { name: projName });
    await addApi(projRoot, {
      'Amazon Cognito User Pool': {},
      transformerVersion: 2,
    });
    await updateApiSchema(projRoot, projName, 'circular_dependency_model.graphql');
    await addCodegen(projRoot, {});
    await expect(cancelAmplifyMockApi(projRoot, {})).resolves.not.toThrow();
  });
  it('should not have circular dependency error when pushing api with a specific GraphQL schema', async () => {
    const projName = 'circulardependency';
    await initJSProjectWithProfile(projRoot, { name: projName });
    await addApi(projRoot, {
      'Amazon Cognito User Pool': {},
      transformerVersion: 2,
    });
    await updateApiSchema(projRoot, projName, 'circular_dependency_model.graphql');
    await expect(amplifyPush(projRoot)).resolves.not.toThrow();
  });
})
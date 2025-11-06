import {
  addFeatureFlag,
  generateModelsWithUnknownTypeError,
  updateApiSchema,
  generateModels,
  createNewProjectDir,
  deleteProjectDir,
} from 'amplify-category-api-e2e-core';
import { amplifyAppAndroid, amplifyAppAngular, amplifyAppIos, amplifyAppReact } from '../amplify-app-helpers/amplify-app-setup';

// This is to fix the issue of error not rejected in the codebuild,
async function testModelsWithUnknownType(projRoot: string): Promise<void> {
  if (process.env.CIRCLECI) {
    await expect(generateModels(projRoot)).rejects.toThrow();
  } else if (process.env.CODEBUILD) {
    await generateModelsWithUnknownTypeError(projRoot);
  }
}

describe('data store modelgen tests', () => {
  let projRoot: string;
  const schemaWithAppSyncScalars = 'modelgen/model_gen_schema_with_aws_scalars.graphql';
  const schemaWithError = 'modelgen/model_gen_schema_with_errors.graphql';
  const projName = 'amplifyDatasource';

  beforeEach(async () => {
    projRoot = await createNewProjectDir('codegen-model');
  });

  afterEach(() => {
    deleteProjectDir(projRoot);
  });

  it('should generate models for android project', async () => {
    await amplifyAppAndroid(projRoot);
    updateApiSchema(projRoot, projName, schemaWithAppSyncScalars);

    await addFeatureFlag(projRoot, 'graphqltransformer', 'transformerVersion', 1);
    await addFeatureFlag(projRoot, 'graphqltransformer', 'useExperimentalPipelinedTransformer', false);

    await expect(generateModels(projRoot)).resolves.not.toThrow();
    updateApiSchema(projRoot, projName, schemaWithError);
    await testModelsWithUnknownType(projRoot);
  });

  it('should generate models for iOS project', async () => {
    await amplifyAppIos(projRoot);
    updateApiSchema(projRoot, projName, schemaWithAppSyncScalars);

    await addFeatureFlag(projRoot, 'graphqltransformer', 'transformerVersion', 1);
    await addFeatureFlag(projRoot, 'graphqltransformer', 'useExperimentalPipelinedTransformer', false);

    await expect(generateModels(projRoot)).resolves.not.toThrow();
    updateApiSchema(projRoot, projName, schemaWithError);
    await testModelsWithUnknownType(projRoot);
  });

  it('should generate models for angular project', async () => {
    await amplifyAppAngular(projRoot);
    updateApiSchema(projRoot, projName, schemaWithAppSyncScalars);

    await addFeatureFlag(projRoot, 'graphqltransformer', 'transformerVersion', 1);
    await addFeatureFlag(projRoot, 'graphqltransformer', 'useExperimentalPipelinedTransformer', false);

    await expect(generateModels(projRoot)).resolves.not.toThrow();
    updateApiSchema(projRoot, projName, schemaWithError);
    await testModelsWithUnknownType(projRoot);
  });

  it('should generate models for react project', async () => {
    await amplifyAppReact(projRoot);
    updateApiSchema(projRoot, projName, schemaWithAppSyncScalars);

    await addFeatureFlag(projRoot, 'graphqltransformer', 'transformerVersion', 1);
    await addFeatureFlag(projRoot, 'graphqltransformer', 'useExperimentalPipelinedTransformer', false);

    await expect(generateModels(projRoot)).resolves.not.toThrow();
    updateApiSchema(projRoot, projName, schemaWithError);
    await testModelsWithUnknownType(projRoot);
  });
});

import {
  createNewProjectDir,
  deleteProject,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta,
  initJSProjectWithProfile,
  updateApiSchema,
  amplifyPush,
  addApiWithBlankSchemaAndConflictDetection,
  updateApiConflictHandlerType,
} from 'amplify-category-api-e2e-core';
import { ConflictHandlerType } from '@aws-amplify/graphql-transformer-core';

const verifyApiExists = async (meta: any, projName: string): Promise<void> => {
  const region = meta.providers.awscloudformation.Region;
  const { output } = meta.api[projName];
  const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
  const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, region);

  expect(GraphQLAPIIdOutput).toBeDefined();
  expect(GraphQLAPIEndpointOutput).toBeDefined();
  expect(GraphQLAPIKeyOutput).toBeDefined();
  expect(graphqlApi).toBeDefined();
  expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);
  expect(GraphQLAPIIdOutput).toBeDefined();
  expect(GraphQLAPIEndpointOutput).toBeDefined();
  expect(GraphQLAPIKeyOutput).toBeDefined();
  expect(graphqlApi).toBeDefined();
  expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);
};

const verifyFunctionDefined = (meta: any): void => {
  expect(meta.function).toBeDefined();
  expect(Object.keys(meta.function).length).toBeGreaterThanOrEqual(1);
  for (const key of Object.keys(meta.function)) {
    const {
      service,
      build,
      lastBuildTimeStamp,
      lastPackageTimeStamp,
      distZipFilename,
      lastPushTimeStamp,
      lastPushDirHash,
    } = meta.function[key];
    expect(service).toBe('Lambda');
    expect(build).toBeTruthy();
    expect(lastBuildTimeStamp).toBeDefined();
    expect(lastPackageTimeStamp).toBeDefined();
    expect(distZipFilename).toBeDefined();
    expect(lastPushTimeStamp).toBeDefined();
    expect(lastPushDirHash).toBeDefined();
  }
};

describe('amplify api (GraphQL) - Customer Lambda Conflict Handler', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir('lambda-conflict-handler');
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('amplify add api (GraphQL) - Custom Lambda Conflict Handler', async () => {
    const envName = 'test';
    const projName = 'addlambdahandler';
    await initJSProjectWithProfile(projRoot, { name: projName, envName });
    await addApiWithBlankSchemaAndConflictDetection(projRoot, { conflictHandlerType: ConflictHandlerType.LAMBDA });
    await updateApiSchema(projRoot, projName, 'simple_model.graphql');
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);

    await verifyApiExists(meta, projName);
    verifyFunctionDefined(meta);
  });

  it('amplify update api (GraphQL) - Custom Lambda Conflict Resolver', async () => {
    const envName = 'test';
    const projName = 'updatelambdahandler';
    await initJSProjectWithProfile(projRoot, { name: projName, envName });
    await addApiWithBlankSchemaAndConflictDetection(projRoot);
    await updateApiSchema(projRoot, projName, 'simple_model.graphql');
    await updateApiConflictHandlerType(projRoot, { conflictHandlerType: ConflictHandlerType.LAMBDA });
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);

    await verifyApiExists(meta, projName);
    verifyFunctionDefined(meta);
  });
});

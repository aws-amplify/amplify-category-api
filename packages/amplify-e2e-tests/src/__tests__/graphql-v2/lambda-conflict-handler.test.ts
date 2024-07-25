import { ConflictHandlerType } from '@aws-amplify/graphql-transformer-core';
import {
  addApiWithBlankSchemaAndConflictDetection,
  amplifyPush,
  createNewProjectDir,
  deleteProject,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta,
  initJSProjectWithProfile,
  listAppSyncFunctions,
  updateApiConflictHandlerType,
  updateApiConflictHandlerTypePerModel,
  updateApiSchema,
} from 'amplify-category-api-e2e-core';

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
    const { service, build, lastBuildTimeStamp, lastPackageTimeStamp, distZipFilename, lastPushTimeStamp, lastPushDirHash } =
      meta.function[key];
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

    const region = meta.providers.awscloudformation.Region;
    const { GraphQLAPIIdOutput } = meta.api[projName]['output'];
    const { functions } = await listAppSyncFunctions(GraphQLAPIIdOutput, region);
    expect(functions).toBeDefined();
    const lambdaArn = Object.values(meta.function)[0]['output']['Arn'];
    const todoFunctions = functions.filter((f) => f.dataSourceName === 'TodoTable');
    todoFunctions.forEach((func) => {
      expect(func.syncConfig.conflictHandler).toBe('LAMBDA');
      expect(func.syncConfig.conflictDetection).toBe('VERSION');
      expect(func.syncConfig.lambdaConflictHandlerConfig.lambdaConflictHandlerArn).toBe(lambdaArn);
    });
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

    const region = meta.providers.awscloudformation.Region;
    const { GraphQLAPIIdOutput } = meta.api[projName]['output'];
    const { functions } = await listAppSyncFunctions(GraphQLAPIIdOutput, region);
    expect(functions).toBeDefined();
    const lambdaArn = Object.values(meta.function)[0]['output']['Arn'];
    const todoFunctions = functions.filter((f) => f.dataSourceName === 'TodoTable');
    todoFunctions.forEach((func) => {
      expect(func.syncConfig.conflictHandler).toBe('LAMBDA');
      expect(func.syncConfig.conflictDetection).toBe('VERSION');
      expect(func.syncConfig.lambdaConflictHandlerConfig.lambdaConflictHandlerArn).toBe(lambdaArn);
    });
  });

  it('amplify update api (GraphQL) - Per model rule of Conflict Resolution', async () => {
    const envName = 'test';
    const projName = 'permodelconflict';
    await initJSProjectWithProfile(projRoot, { name: projName, envName });
    await addApiWithBlankSchemaAndConflictDetection(projRoot);
    await updateApiSchema(projRoot, projName, 'simple_two_models.graphql');
    await updateApiConflictHandlerTypePerModel(projRoot);
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);

    await verifyApiExists(meta, projName);
    verifyFunctionDefined(meta);

    const region = meta.providers.awscloudformation.Region;
    const { GraphQLAPIIdOutput } = meta.api[projName]['output'];
    const { functions } = await listAppSyncFunctions(GraphQLAPIIdOutput, region);
    expect(functions).toBeDefined();
    const lambdaArn = Object.values(meta.function)[0]['output']['Arn'];
    const todoFunctions = functions.filter((f) => f.dataSourceName === 'TodoTable');
    todoFunctions.forEach((func) => {
      expect(func.syncConfig.conflictHandler).toBe('LAMBDA');
      expect(func.syncConfig.conflictDetection).toBe('VERSION');
      expect(func.syncConfig.lambdaConflictHandlerConfig.lambdaConflictHandlerArn).toBe(lambdaArn);
    });
    const authorFunctions = functions.filter((f) => f.dataSourceName === 'AuthorTable');
    authorFunctions.forEach((func) => {
      expect(func.syncConfig.conflictHandler).toBe('AUTOMERGE');
      expect(func.syncConfig.conflictDetection).toBe('VERSION');
      expect(func.syncConfig.lambdaConflictHandlerConfig).not.toBeDefined();
    });
  });
});

import * as path from 'path';
import {
  addAuthWithGroupsAndAdminAPI,
  addRestApi,
  amplifyOverrideApi,
  amplifyPushAuth,
  buildOverrides,
  createNewProjectDir,
  deleteProject,
  deleteProjectDir,
  get,
  getProjectMeta,
  initJSProjectWithProfile,
  replaceOverrideFileWithProjectInfo,
  updateRestApi,
} from 'amplify-category-api-e2e-core';
import { pathManager, stateManager, JSONUtilities } from '@aws-amplify/amplify-cli-core';
import * as fs from 'fs-extra';
import { v4 as uuid } from 'uuid';
import fetch from 'node-fetch';

const [shortId] = uuid().split('-');
const projName = `apigwtest${shortId}`;

describe('API Gateway e2e tests', () => {
  let projRoot: string;
  beforeEach(async () => {
    projRoot = await createNewProjectDir(projName);
    await initJSProjectWithProfile(projRoot, { name: projName });
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('adds multiple rest apis and pushes', async () => {
    const firstRestApiName = `firstE2eRestApi${shortId}`;
    const secondRestApiName = `secondE2eRestApi${shortId}`;

    await addRestApi(projRoot, { apiName: firstRestApiName });
    await amplifyPushAuth(projRoot);
    await addAuthWithGroupsAndAdminAPI(projRoot); // Groups: Admins, Users
    await amplifyPushAuth(projRoot);
    await addRestApi(projRoot, { isFirstRestApi: false, path: '/foo', projectContainsFunctions: true }); // Add a path
    await addRestApi(projRoot, {
      apiName: secondRestApiName,
      isFirstRestApi: false,
      restrictAccess: true,
      allowGuestUsers: true,
      hasUserPoolGroups: true,
      projectContainsFunctions: true,
    });
    await amplifyPushAuth(projRoot); // Pushes multiple rest api updates

    const projMeta = getProjectMeta(projRoot);
    expect(projMeta).toBeDefined();
    expect(projMeta.api).toBeDefined();
    expect(projMeta.api.AdminQueries).toBeDefined();
    expect(projMeta.api[firstRestApiName]).toBeDefined();
    expect(projMeta.api[secondRestApiName]).toBeDefined();

    const firstRootUrl = projMeta.api[firstRestApiName].output?.RootUrl;
    const secondRootUrl = projMeta.api[secondRestApiName].output?.RootUrl;
    expect(firstRootUrl).toBeDefined();
    expect(secondRootUrl).toBeDefined();

    const firstItemsResponse = await get(`${firstRootUrl}/items`);
    const fooResponse = await get(`${firstRootUrl}/foo`);
    const secondItemsResponse = await get(`${secondRootUrl}/items`);

    const firstItemsResJson = await firstItemsResponse.json();
    const fooResJson = await fooResponse.json();
    const secondItemsResJson = await secondItemsResponse.json();

    expect(firstItemsResJson).toEqual({ success: 'get call succeed!', url: '/items' });
    expect(fooResJson).toEqual({ success: 'get call succeed!', url: '/foo' });
    expect(secondItemsResJson).toEqual({ message: 'Missing Authentication Token' }); // Restricted API
  });

  it('adds rest api and verify the default 4xx response', async () => {
    const apiName = 'integtest';
    await addRestApi(projRoot, {
      apiName,
    });
    await amplifyPushAuth(projRoot);
    const projMeta = getProjectMeta(projRoot);
    expect(projMeta).toBeDefined();
    expect(projMeta.api).toBeDefined();
    const apiPath = projMeta?.api?.[apiName]?.output?.RootUrl;
    expect(apiPath).toBeDefined();
    const res = await fetch(apiPath);
    expect(res.status).toEqual(403);
    expect(res.headers.get('access-control-allow-headers')).toEqual('Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token');
    expect(res.headers.get('access-control-allow-methods')).toEqual('DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT');
    expect(res.headers.get('access-control-allow-origin')).toEqual('*');
    expect(res.headers.get('access-control-expose-headers')).toEqual('Date,X-Amzn-ErrorType');

    // Add a path and make sure that the gateway responses are preserved
    await updateRestApi(projRoot);
    await amplifyPushAuth(projRoot);
    const responseAfterAddPath = await fetch(apiPath);
    expect(responseAfterAddPath.status).toEqual(403);
    expect(responseAfterAddPath.headers.get('access-control-allow-headers')).toEqual(
      'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    );
    expect(responseAfterAddPath.headers.get('access-control-allow-methods')).toEqual('DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT');
    expect(responseAfterAddPath.headers.get('access-control-allow-origin')).toEqual('*');
    expect(responseAfterAddPath.headers.get('access-control-expose-headers')).toEqual('Date,X-Amzn-ErrorType');
  });

  it('adds and overrides a rest api, then pushes', async () => {
    const restApiName = `e2eRestApi${shortId}`;

    await addRestApi(projRoot, { apiName: restApiName });
    await amplifyOverrideApi(projRoot, {});

    // this is where we will write overrides to
    const destOverrideTsFilePath = path.join(pathManager.getResourceDirectoryPath(projRoot, 'api', restApiName), 'override.ts');

    // test override file in compilation error state
    const srcInvalidOverrideCompileError = path.join(__dirname, '..', '..', 'overrides', 'override-compile-error.txt');
    fs.copyFileSync(srcInvalidOverrideCompileError, destOverrideTsFilePath);
    await expect(amplifyPushAuth(projRoot)).rejects.toThrow();

    // test override file in runtime error state
    const srcInvalidOverrideRuntimeError = path.join(__dirname, '..', '..', 'overrides', 'override-runtime-error.txt');
    fs.copyFileSync(srcInvalidOverrideRuntimeError, destOverrideTsFilePath);
    await expect(amplifyPushAuth(projRoot)).rejects.toThrow();

    // test happy path
    const srcOverrideFilePath = path.join(__dirname, '..', '..', 'overrides', 'override-api-rest.ts');
    replaceOverrideFileWithProjectInfo(srcOverrideFilePath, destOverrideTsFilePath, 'integtest', projName);

    await buildOverrides(projRoot, {});

    const cfnPath = path.join(
      pathManager.getResourceDirectoryPath(projRoot, 'api', restApiName),
      'build',
      `${restApiName}-cloudformation-template.json`,
    );
    const cfn = JSONUtilities.readJson<any>(cfnPath);
    const parameters = stateManager.getResourceParametersJson(projRoot, 'api', restApiName);
    expect(parameters.DESCRIPTION).toBeDefined();
    expect(parameters.DESCRIPTION).toEqual({ 'Fn::Join': [' ', ['Description', 'override', 'successful']] });
    expect(cfn?.Resources?.[restApiName]?.Properties?.Description).toEqual({ Ref: 'DESCRIPTION' });
    await amplifyPushAuth(projRoot);
  });
});

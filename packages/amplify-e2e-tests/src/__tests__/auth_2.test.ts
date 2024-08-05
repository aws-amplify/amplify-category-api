import {
  addAuthViaAPIWithTrigger,
  addAuthwithUserPoolGroupsViaAPIWithTrigger,
  amplifyPush,
  createNewProjectDir,
  deleteProject,
  deleteProjectDir,
  getLambdaFunction,
  getProjectMeta,
  getUserPool,
  getUserPoolClients,
  initJSProjectWithProfile,
  updateFunction,
  validateNodeModulesDirRemoval,
} from 'amplify-category-api-e2e-core';

const defaultsSettings = {
  name: 'authTest',
};

describe('amplify add auth...', () => {
  let projRoot: string;
  beforeEach(async () => {
    projRoot = await createNewProjectDir('auth');
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('...should allow the user to add auth via API category, with a trigger', async () => {
    await initJSProjectWithProfile(projRoot, defaultsSettings);
    await addAuthViaAPIWithTrigger(projRoot, { transformerVersion: 1 });
    await amplifyPush(projRoot);
    const meta = getProjectMeta(projRoot);

    const functionName = `${Object.keys(meta.auth)[0]}PostConfirmation-integtest`;
    const authMeta = Object.keys(meta.auth).map((key) => meta.auth[key])[0];
    const id = authMeta.output.UserPoolId;
    const userPool = await getUserPool(id, meta.providers.awscloudformation.Region);
    const clientIds = [authMeta.output.AppClientIDWeb, authMeta.output.AppClientID];
    const clients = await getUserPoolClients(id, clientIds, meta.providers.awscloudformation.Region);

    const lambdaFunction = await getLambdaFunction(functionName, meta.providers.awscloudformation.Region);
    expect(userPool.UserPool).toBeDefined();
    expect(userPool.UserPool.AliasAttributes).not.toBeDefined();
    validateNodeModulesDirRemoval(projRoot);
    expect(clients).toHaveLength(2);
    expect(lambdaFunction).toBeDefined();
    expect(lambdaFunction.Configuration.Environment.Variables.GROUP).toEqual('mygroup');
  });

  it('...should allow the user to add auth via API category, with a trigger and function dependsOn API', async () => {
    await initJSProjectWithProfile(projRoot, defaultsSettings);
    await addAuthwithUserPoolGroupsViaAPIWithTrigger(projRoot, { transformerVersion: 1 });
    await updateFunction(
      projRoot,
      {
        functionTemplate: 'Hello World',
        additionalPermissions: {
          permissions: ['storage'],
          choices: ['function', 'auth', 'api', 'storage'],
          resources: ['Todo:@model(appsync)'],
          resourceChoices: ['Todo:@model(appsync)'],
          operations: ['read'],
        },
      },
      'nodejs',
    );
    await amplifyPush(projRoot);
    const meta = getProjectMeta(projRoot);
    const authKey = Object.keys(meta.auth).find((key) => meta.auth[key].service === 'Cognito');
    const functionName = `${authKey}PostConfirmation-integtest`;
    const authMeta = meta.auth[authKey];
    const id = authMeta.output.UserPoolId;
    const userPool = await getUserPool(id, meta.providers.awscloudformation.Region);
    const clientIds = [authMeta.output.AppClientIDWeb, authMeta.output.AppClientID];
    const clients = await getUserPoolClients(id, clientIds, meta.providers.awscloudformation.Region);
    const lambdaFunction = await getLambdaFunction(functionName, meta.providers.awscloudformation.Region);
    expect(userPool.UserPool).toBeDefined();
    expect(Object.keys(userPool.UserPool.LambdaConfig)[0]).toBe('PostConfirmation');
    expect(Object.values(userPool.UserPool.LambdaConfig)[0]).toBe(meta.function[functionName.split('-')[0]].output.Arn);
    validateNodeModulesDirRemoval(projRoot);
    expect(clients).toHaveLength(2);
    expect(lambdaFunction).toBeDefined();
    expect(lambdaFunction.Configuration.Environment.Variables.GROUP).toEqual('mygroup');
  });
});

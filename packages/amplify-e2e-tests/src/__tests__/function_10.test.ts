import {
  addApiWithBlankSchema, addFunction,
  amplifyPush,
  amplifyPushFunction, createNewProjectDir, deleteProject, deleteProjectDir, initJSProjectWithProfile, updateApiSchema,
} from 'amplify-category-api-e2e-core';

describe('test function deploy when other resources are present', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await createNewProjectDir('functions');
  });

  afterEach(async () => {
    await deleteProject(projectRoot);
    deleteProjectDir(projectRoot);
  });

  it('testing amplify push function command', async () => {
    const apiName = 'myApi';
    await initJSProjectWithProfile(projectRoot, {
      name: 'functions',
    });
    await addApiWithBlankSchema(projectRoot, { apiName });
    await updateApiSchema(projectRoot, apiName, 'simple_model.graphql');
    await amplifyPush(projectRoot);
    const random = Math.floor(Math.random() * 10000);
    const fnName = `integtestFn${random}`;
    await addFunction(projectRoot, {
      name: fnName,
      functionTemplate: 'Hello World',
    },
    'nodejs');
    await amplifyPushFunction(projectRoot);
  });
// amplify push function -- test with two functions
  it('testing amplify push function command with AppSync VTL ', async () => {
    const apiName = 'myApi';
    await initJSProjectWithProfile(projectRoot, {
      name: 'functions',
    });
    await addApiWithBlankSchema(projectRoot, { apiName });
    await updateApiSchema(projectRoot, apiName, 'simple_model.graphql');
    await amplifyPush(projectRoot);
    const random = Math.floor(Math.random() * 10000);
    const fnName = `integtestFn${random}`;
    const fnTwoName = `integtestFnTwo${random}`;
    await addFunction(projectRoot, {
      name: fnName,
      functionTemplate: 'AppSync - GraphQL API request (with IAM)',
    },
    'nodejs');
    await addFunction(projectRoot, {
      name: fnTwoName,
      functionTemplate: 'AppSync - GraphQL API request (with IAM)',
    },
    'nodejs');
    await amplifyPushFunction(projectRoot);
  });
});

/* eslint-disable testing-library/await-async-utils */
import path from 'path';
import _ from 'lodash';
import { existsSync, rmSync } from 'fs';
import cypress from 'cypress';
import { setup, teardown } from 'jest-dev-server';
import { initJSProjectWithProfile, addApiWithoutSchema, updateApiSchema, amplifyPush, runCodegen, deleteProject } from './cli';

jest.setTimeout(20 * 60 * 1000); // 20 minutes

describe('simple model interaction tests', () => {
  beforeAll(async () => {
    const projRoot = path.join(__dirname, '..', '..');
    if (existsSync(path.join(projRoot, 'amplify'))) {
      rmSync(path.join(projRoot, 'amplify'), { recursive: true })
    }
    if (existsSync(path.join(projRoot, 'src', 'graphql'))) {
      rmSync(path.join(projRoot, 'src', 'graphql'), { recursive: true })
    }
    if (existsSync(path.join(projRoot, 'src', 'API.ts'))) {
      rmSync(path.join(projRoot, 'src', 'API.ts'))
    }
    if (existsSync(path.join(projRoot, 'src', 'aws-exports.js'))) {
      rmSync(path.join(projRoot, 'src', 'aws-exports.js'))
    }
    if (existsSync(path.join(projRoot, '.graphqlconfig.yml'))) {
      rmSync(path.join(projRoot, '.graphqlconfig.yml'))
    }

    const envName = 'devtest';
    const projName = 'simplemodel';
    const schemaText = `
    type Todo @model @auth(rules: [{ allow: public }]) {
      id: ID!
      content: String
    }`;

    await initJSProjectWithProfile(projRoot, { name: projName, envName });
    await addApiWithoutSchema(projRoot);
    await updateApiSchema(projRoot, projName, schemaText);
    await amplifyPush(projRoot);
    await runCodegen(projRoot);

    await setup({
      command: `yarn start`,
      launchTimeout: 50000,
      port: 3000,
    })
  });

  afterAll(async () => {
    const projRoot = path.join(__dirname, '..', '..');
    try {
      await deleteProject(projRoot);
    } catch (e) {}

    await teardown();
  });

  it('executes the cypress suite', async () => {
    const runResult = await cypress.run({
      reporter: 'junit',
      browser: 'firefox',
      config: {
        video: true,
      },
    })
    expect(runResult.status).toEqual('finished');
    expect((runResult as any).totalFailed).toEqual(0);
  });
});

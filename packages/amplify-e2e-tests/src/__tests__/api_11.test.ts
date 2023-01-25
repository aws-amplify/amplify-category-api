import {
  addApiWithoutSchema,
  amplifyPush,
  createNewProjectDir,
  deleteProject,
  deleteProjectDir,
  getProjectMeta,
  initJSProjectWithProfile,
  updateApiSchema,
  updateHeadlessApi,
  getSchemaPath,
} from 'amplify-category-api-e2e-core';
import path from 'path';
import { UpdateApiRequest } from 'amplify-headless-interface';
import * as fs from 'fs-extra';

describe('API Key Extension tests', () => {
  let projRoot: string;
  beforeEach(async () => {
    projRoot = await createNewProjectDir('graphql-api');
  });

  afterEach(async () => {
    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (fs.existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
  });

  it('Should allow extension of API keys', async () => {
    const name = 'extendapikey';
    await initJSProjectWithProfile(projRoot, { name });
    await addApiWithoutSchema(projRoot, { transformerVersion: 2 });
    await updateApiSchema(projRoot, name, 'simple_model.graphql');
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);
    const { output } = meta.api[name];
    const { GraphQLAPIKeyExpirationOutput } = output;

    expect(GraphQLAPIKeyExpirationOutput).toBeDefined();

    const numberOfDaysToExtend = 2;
    const updateApiRequest: UpdateApiRequest = {
      version: 1,
      serviceModification: {
        serviceName: 'AppSync',
        transformSchema: fs.readFileSync(getSchemaPath('simple_model.graphql')).toString(),
        defaultAuthType: {
          mode: 'API_KEY',
        },
        additionalAuthTypes: [],
        apiKeyExpiration: {
          days: numberOfDaysToExtend,
        },
      },
    };
    await updateHeadlessApi(projRoot, updateApiRequest);
    await amplifyPush(projRoot);

    const newMeta = getProjectMeta(projRoot);
    const newOutput = newMeta.api[name].output;
    const laterApiKeyExpiration = newOutput.GraphQLAPIKeyExpirationOutput;

    expect(laterApiKeyExpiration).toBeDefined();
    expect(laterApiKeyExpiration).toBeGreaterThan(GraphQLAPIKeyExpirationOutput);
    // Expect the difference to be the number of days times the seconds in a day
    expect(Number(laterApiKeyExpiration) - Number(GraphQLAPIKeyExpirationOutput)).toEqual(86400 * numberOfDaysToExtend);
  });
});

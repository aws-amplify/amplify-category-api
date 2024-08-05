import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as path from 'path';
import { cdkDeploy, cdkDestroy, initCDKProject } from '../commands';
import { graphql, graphqlRequestWithLambda } from '../graphql-request';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK Auth Modes', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir('allauthmodes');
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('CDK deploys with all auth modes enabled', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'all-auth-modes'));
    const name = await initCDKProject(projRoot, templatePath, { additionalDependencies: ['esbuild'] });
    const outputs = await cdkDeploy(projRoot, '--all');
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

    // Shallow validation that api key works (e.g. stack deployed successfully)
    const createResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_TODO {
          createTodo(input: {}) {
            id
          }
        }
      `,
    );
    expect(createResult.statusCode).toEqual(200);

    const listTodosQuery = /* GraphQL */ `
      query LIST_TODOS {
        listTodos {
          items {
            id
          }
        }
      }
    `;

    const listWithInvalidTokenResult = await graphqlRequestWithLambda(apiEndpoint, 'badtoken', listTodosQuery);
    expect(listWithInvalidTokenResult.statusCode).toEqual(400);

    const listWithValidTokenResult = await graphqlRequestWithLambda(apiEndpoint, 'letmein', listTodosQuery);
    expect(listWithValidTokenResult.statusCode).toEqual(200);
  });
});

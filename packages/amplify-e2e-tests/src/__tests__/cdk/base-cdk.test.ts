import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { graphql } from './graphql-utils';

describe('CDK GraphQL Transformer', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdktransformer';
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('CDK base case', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'base-cdk'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { GraphQLAPIEndpointOutput: apiEndpoint, GraphQLAPIKeyOutput: apiKey } = outputs[name];

    const result = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_TODO {
          createTodo(input: { description: "todo desc" }) {
            id
            description
          }
        }
      `,
    );

    expect(result).toMatchSnapshot({
      body: {
        data: {
          createTodo: {
            id: expect.any(String),
          },
        },
      },
    });

    const todo = result.body.data.createTodo;

    const listResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query LIST_TODOS {
          listTodos {
            items {
              id
              description
            }
          }
        }
      `,
    );
    expect(listResult).toMatchSnapshot({
      body: {
        data: {
          listTodos: {
            items: [
              {
                id: expect.any(String),
              },
            ],
          },
        },
      },
    });

    expect(todo.id).toEqual(listResult.body.data.listTodos.items[0].id);
  });
});

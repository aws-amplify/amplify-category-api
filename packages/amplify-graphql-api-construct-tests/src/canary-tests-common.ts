import { graphql } from './graphql-request';
import { initCDKProject, cdkDeploy, cdkDestroy } from './commands';

export const setupBackend = async (projRoot: string, templatePath: string) => {
  const name = await initCDKProject(projRoot, templatePath);
  const outputs = await cdkDeploy(projRoot, '--all');
  if (!outputs || !outputs[name]) {
    throw new Error('CDK deploy did not yield any outputs');
  }
  return outputs[name];
};

export const testGraphQLOperations = async (apiEndpoint: string, apiKey: string) => {
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
};

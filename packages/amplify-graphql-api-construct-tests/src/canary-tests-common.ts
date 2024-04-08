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
  // create a new todo
  const createResult = await graphql(
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

  const todo = createResult.body.data.createTodo;
  expect(todo.id).toBeDefined();

  // update the created todo
  const updateResult = await graphql(
    apiEndpoint,
    apiKey,
    /* GraphQL */ `
      mutation UPDATE_TODO {
        updateTodo(input: { id: "${todo.id}", description: "todo desc updated" }) {
          id
          description
        }
      }
    `,
  );

  const todoUpdated = updateResult.body.data.updateTodo;
  expect(todoUpdated.id).toEqual(todo.id);
  expect(todoUpdated.description).toEqual('todo desc updated');

  // Query the updated todo
  const getTodoResult = await graphql(
    apiEndpoint,
    apiKey,
    /* GraphQL */ `
        query GET_TODO {
            getTodo(id: "${todo.id}") { 
                id
                description
            }
          }
    `,
  );

  const todoRead = getTodoResult.body.data.getTodo;
  expect(todoRead.id).toEqual(todoUpdated.id);
  expect(todoRead.description).toEqual(todoUpdated.description);

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

  const listItems = listResult.body.data.listTodos.items;
  expect(listItems).toHaveLength(1);
  expect(listItems[0].id).toEqual(todoUpdated.id);
  expect(listItems[0].description).toEqual(todoUpdated.description);

  // Delete the todo
  await graphql(
    apiEndpoint,
    apiKey,
    /* GraphQL */ `
        mutation DELETE_TODO {
          deleteTodo(input: { id: "${todo.id}" }) {
            id
          }
        }
      `,
  );

  // Verify that the todo is deleted
  const emptyListResult = await graphql(
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

  expect(emptyListResult.body.data.listTodos.items.length).toEqual(0);
};

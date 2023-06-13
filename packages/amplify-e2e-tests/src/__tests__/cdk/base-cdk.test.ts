import * as path from "path";
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from "amplify-category-api-e2e-core";
import { default as fetch, Request } from "node-fetch";

describe("CDK GraphQL Transformer", () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = "cdktransformer";
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, "--all");
    } catch (_) {
      // No-op.
    }

    deleteProjectDir(projRoot);
  });

  test("CDK base case", async () => {
    const templatePath = path.resolve(path.join(__dirname, "backends", "base-cdk"));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, "--all");
    const { GraphQLAPIEndpointOutput: apiEndpoint, GraphQLAPIKeyOutput: apiKey } = outputs[name];

    const assertGraphQLQuerySnapshot = async (query: string, queryName: string) => {
      const result = await graphql(apiEndpoint, apiKey, query);
      expect(result).toMatchSnapshot({
        body: {
          data: {
            [queryName]: {
              id: expect.any(String),
            },
          },
        },
      });
      return result;
    };

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
      `
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

    expect(
      await graphql(
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
        `
      )
    ).toMatchSnapshot({
      body: {
        data: {
          listTodos: {
            items: [
              {
                id: todo.id,
              },
            ],
          },
        },
      },
    });
  });
});

async function graphql(apiEndpoint: string, apiKey: string, query: string) {
  const options = {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  };

  const request = new Request(apiEndpoint, options);

  let statusCode = 200;
  let body;
  let response;

  try {
    response = await fetch(request);
    body = await response.json();
    if (body.errors) statusCode = 400;
  } catch (error) {
    statusCode = 400;
    body = {
      errors: [
        {
          status: response?.status,
          message: error.message,
          stack: error.stack,
        },
      ],
    };
  }

  return {
    statusCode,
    body: body,
  };
}

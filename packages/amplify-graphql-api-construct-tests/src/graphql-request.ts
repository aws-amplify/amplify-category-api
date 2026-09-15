import { default as fetch, Request } from 'node-fetch';

export type GraphqlResponse = {
  statusCode: number;
  body: any;
};

export const graphqlRequest = async (apiEndpoint: string, payload: any): Promise<GraphqlResponse> => {
  let statusCode = 200;
  let body;
  let response;

  try {
    response = await fetch(new Request(apiEndpoint, payload));
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
};

export type ValidateGraphqlOptions = {
  query: string;
  apiEndpoint: string;
  apiKey: string;
  expectedStatusCode?: number;
};

/**
 * Run a graphql request, and run cursory verifications on the response object.
 * @returns the result, if validations pass.
 */
export const validateGraphql = async ({
  query,
  apiEndpoint,
  apiKey,
  expectedStatusCode,
}: ValidateGraphqlOptions): Promise<GraphqlResponse> => {
  const response = await graphql(apiEndpoint, apiKey, query);

  if (expectedStatusCode) {
    expect(response.statusCode).toEqual(expectedStatusCode);
  }

  return response;
};

export const graphql = async (apiEndpoint: string, apiKey: string, query: string): Promise<GraphqlResponse> =>
  graphqlRequest(apiEndpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

export const graphqlRequestWithLambda = async (apiEndpoint: string, authToken: string, query: string): Promise<GraphqlResponse> =>
  graphqlRequest(apiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

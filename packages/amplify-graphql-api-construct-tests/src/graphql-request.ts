import { default as fetch, Request } from 'node-fetch';

export type GraphqlResponse = {
  statusCode: number;
  body: any;
};

export const graphql = async (apiEndpoint: string, apiKey: string, query: string): Promise<GraphqlResponse> => {
  const options = {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
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
};

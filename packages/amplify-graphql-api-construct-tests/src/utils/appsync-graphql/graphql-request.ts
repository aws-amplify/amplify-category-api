import { IHttpRequest } from '@smithy/protocol-http';
import { QueryParameterBag } from '@smithy/types';
import { makeSignedRequest, makeTemporaryCredentialsProvider, urlToHttpRequestOptions } from '..';

export type GraphqlResponse = {
  statusCode: number;
  body: any;
};

export const graphqlRequest = async (request: Request): Promise<GraphqlResponse> => {
  let statusCode = 200;
  let body;
  let response;

  try {
    response = await fetch(request);
    body = await response.json();
    if (body.errors) {
      statusCode = 400;
    }
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

export const graphql = async (apiEndpoint: string, apiKey: string, query: string): Promise<GraphqlResponse> => {
  const request = new Request(apiEndpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return graphqlRequest(request);
};

export const graphqlRequestWithLambda = async (apiEndpoint: string, authToken: string, query: string): Promise<GraphqlResponse> => {
  const request = new Request(apiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return graphqlRequest(request);
};

export const graphqlWithSigV4 = async (signedRequest: IHttpRequest): Promise<GraphqlResponse> => {
  const request = sigV4SignedRequestToNodeFetchRequest(signedRequest);
  return graphqlRequest(request);
};

const queryBagToQueryString = (bag?: QueryParameterBag): string => {
  if (!bag) {
    return '';
  }

  const components: string[] = [];
  Object.entries(bag).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((val) => components.push(`${key}=${encodeURIComponent(val)}`));
    } else {
      components.push(`${key}=${encodeURIComponent(value)}`);
    }
  });

  if (components.length > 0) {
    return '?' + components.join('&');
  } else {
    return '';
  }
};

/**
 * Returns a query and optional variables in the correct structure for processing a GraphQL request
 */
export const getPayloadStringForGraphqlRequest = (query: string, variables?: any): string => {
  const payload: any = {
    query: query,
  };

  if (variables) {
    payload.variables = variables;
  }

  return JSON.stringify(payload);
};

export interface GetSignedAppSyncRequestOptions {
  body?: string;
  endpoint: string;
  region: string;
  roleArn: string;
  sessionNamePrefix: string;
}

export const getSigV4SignedAppSyncRequest = async (options: GetSignedAppSyncRequestOptions): Promise<IHttpRequest> => {
  const { body, endpoint, region, roleArn, sessionNamePrefix } = options;

  const credentials = makeTemporaryCredentialsProvider({ roleArn, region, sessionNamePrefix });

  const url = new URL(endpoint);

  const requestOptions = urlToHttpRequestOptions(url, 'POST');
  requestOptions.headers = requestOptions.headers ?? {};
  requestOptions.headers['Content-Type'] = 'application/json';
  requestOptions.headers['Host'] = url.host;

  requestOptions.body = body;

  const signedRequest = await makeSignedRequest({
    credentials,
    region,
    requestOptions,
    service: 'appsync',
  });

  return signedRequest;
};

export const sigV4SignedRequestToNodeFetchRequest = (signedRequest: IHttpRequest): Request => {
  // Note that IHttpRequest.protocol includes a terminating `:`, not just the alphanumeric scheme
  const protocol = `${signedRequest.protocol}//`;
  const userPass = signedRequest.username || signedRequest.password ? `${signedRequest.username}:${signedRequest.password}@` : '';
  const hostname = signedRequest.hostname;
  const port = signedRequest.port ? `:${signedRequest.port}` : '';
  const path = signedRequest.path;
  const query = queryBagToQueryString(signedRequest.query);
  const fragment = signedRequest.fragment ? `#${signedRequest.fragment}` : '';

  const urlComponents = [protocol, userPass, hostname, port, path, query, fragment];

  const url = urlComponents.join('');

  const request = new Request(url, signedRequest);
  return request;
};

import { graphqlRequest } from '../../graphql-request';

export interface AppSyncGraphqlResponse<T> {
  statusCode: number;
  body: {
    data?: T;
    errors?: [any];
  };
}

export interface OperationAuthInputAccessToken {
  accessToken: string;
}

export interface OperationAuthInputApiKey {
  apiKey: string;
}

export const isOperationAuthInputAccessToken = (obj: any): obj is OperationAuthInputAccessToken => {
  return typeof (obj as OperationAuthInputAccessToken).accessToken === 'string';
};

export const isOperationAuthInputApiKey = (obj: any): obj is OperationAuthInputApiKey => {
  return typeof (obj as OperationAuthInputApiKey).apiKey === 'string';
};

export const doAppSyncGraphqlOperation = async (input: any): Promise<any> => {
  const { apiEndpoint, auth, query, variables } = input;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (isOperationAuthInputAccessToken(auth)) {
    headers['Authorization'] = auth.accessToken;
  } else if (isOperationAuthInputApiKey(auth)) {
    headers['x-api-key'] = auth.apiKey;
  } else {
    throw new Error(`Unknown auth type: ${auth}`);
  }

  const payload: any = {
    query: query,
  };

  if (variables) {
    payload.variables = variables;
  }

  const result = await graphqlRequest(apiEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  return result;
};

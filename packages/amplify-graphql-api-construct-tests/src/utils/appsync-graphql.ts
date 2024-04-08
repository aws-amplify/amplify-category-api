import { graphqlRequest } from '../graphql-request';

interface OperationAuthInputAccessToken {
  accessToken: string;
}

interface OperationAuthInputApiKey {
  apiKey: string;
}

const isOperationAuthInputAccessToken = (obj: any): obj is OperationAuthInputAccessToken => {
  return typeof (obj as OperationAuthInputAccessToken).accessToken === 'string';
};

const isOperationAuthInputApiKey = (obj: any): obj is OperationAuthInputApiKey => {
  return typeof (obj as OperationAuthInputApiKey).apiKey === 'string';
};

export interface AppSyncGraphqlResponse<Mutation> {
  statusCode: number;
  body: {
    data?: Mutation;
    errors?: [any];
  };
}

interface VariableType {
  input: any;
  condition?: any | null;
}

// This mimics the GeneratedMutation types from API.ts, but by extending the "VariableType" we're able to extract the 'input' field in the
// doAppSyncGraphqlMutation method. That lets us provide type safety to the caller on the input and output types, just by specifying the
// query.
type GeneratedMutation<V extends VariableType, OutputType> = string & {
  __generatedMutationInput: V;
  __generatedMutationOutput: OutputType;
};

export interface DoGraphqlOperationInput<V extends VariableType, Mutation> {
  apiEndpoint: string;
  auth: OperationAuthInputAccessToken | OperationAuthInputApiKey;
  query: GeneratedMutation<V, Mutation>;
  variables?: V['input'];
}

export const doAppSyncGraphqlMutation = async <V extends VariableType, Mutation>(
  input: DoGraphqlOperationInput<V, Mutation>,
): Promise<AppSyncGraphqlResponse<Mutation>> => {
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
    payload.variables = { input: variables };
  }

  const result = await graphqlRequest(apiEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  return result as AppSyncGraphqlResponse<Mutation>;
};

import { AppSyncGraphqlResponse, doAppSyncGraphqlOperation, OperationAuthInputAccessToken, OperationAuthInputApiKey } from './common';

interface MutationVariableType {
  input: any;
  condition?: any | null;
}

// This mimics the GeneratedMutation types from API.ts, but by extending the "VariableType" we're able to extract the 'input' field in the
// doAppSyncGraphqlMutation method. That lets us provide type safety to the caller on the input and output types, just by specifying the
// query.
type GeneratedMutation<V extends MutationVariableType, OutputType> = string & {
  __generatedMutationInput: V;
  __generatedMutationOutput: OutputType;
};

export interface DoAppSyncGraphqlMutationInput<V extends MutationVariableType, Mutation> {
  apiEndpoint: string;
  auth: OperationAuthInputAccessToken | OperationAuthInputApiKey;
  query: GeneratedMutation<V, Mutation>;
  variables?: V['input'];
}

export const doAppSyncGraphqlMutation = async <V extends MutationVariableType, Mutation>(
  input: DoAppSyncGraphqlMutationInput<V, Mutation>,
): Promise<AppSyncGraphqlResponse<Mutation>> => {
  input.variables = { input: input.variables };
  return doAppSyncGraphqlOperation(input);
};

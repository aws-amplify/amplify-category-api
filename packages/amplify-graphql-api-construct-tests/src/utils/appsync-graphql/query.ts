import { AppSyncGraphqlResponse, doAppSyncGraphqlOperation, OperationAuthInputAccessToken, OperationAuthInputApiKey } from './common';

type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export interface DoAppSyncGraphqlQueryInput<InputType, OutputType> {
  apiEndpoint: string;
  auth: OperationAuthInputAccessToken | OperationAuthInputApiKey;
  query: GeneratedQuery<InputType, OutputType>;
  variables?: InputType;
}

export const doAppSyncGraphqlQuery = async <InputType, OutputType>(
  input: DoAppSyncGraphqlQueryInput<InputType, OutputType>,
): Promise<AppSyncGraphqlResponse<OutputType>> => {
  return doAppSyncGraphqlOperation(input);
};

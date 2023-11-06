import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

/**
 * Invoke a lambda function given the function name, and input payload.
 * @param functionName the function to invoke
 * @param payload the function request payload
 * @returns the function response body
 */
export const invokeLambda = async <RequestType, ResponseType>(functionName: string, payload: RequestType): Promise<ResponseType> => {
  const client = new LambdaClient({});
  const { Payload } = await client.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );
  return JSON.parse(Buffer.from(Payload).toString());
};

export type GraphqlProxiedLambdaResponse<ResponseDataType> = {
  statusCode: number;
  body: {
    errors: Array<{
      status?: number;
      message: string;
      stack: string[];
    }>;
    data: ResponseDataType;
  };
};

/**
 * Invoke a lambda function which executes a graphql operation. Assert response code was 200, and return the wrapped data object.
 * @param functionName the function to invoke
 * @param payload the function request payload
 * @returns the graphql wrapped data payload
 */
export const invokeGraphqlProxyLambda = async <RequestType, ResponseDataType>(
  functionName: string,
  payload: RequestType,
): Promise<ResponseDataType> => {
  const lambdaResponse = await invokeLambda<RequestType, GraphqlProxiedLambdaResponse<ResponseDataType>>(functionName, payload);
  expect(lambdaResponse.statusCode).toEqual(200);
  return lambdaResponse.body.data;
};

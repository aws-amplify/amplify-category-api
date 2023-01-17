// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BaseRequestArgs {}

export interface RequestArgs extends BaseRequestArgs {
  input: Map<string, any>
}

export interface BaseRequest {
    table: string;
    operation: 'GET' | 'LIST' | 'CREATE' | 'UPDATE' | 'DELETE';
    operationName: string;
    args: BaseRequestArgs;
}

export interface Request extends BaseRequest {
  table: string;
  operation: 'GET' | 'LIST' | 'CREATE' | 'UPDATE' | 'DELETE';
  operationName: string;
  args: RequestArgs;
}

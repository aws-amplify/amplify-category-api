// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BaseRequestArgs {
  metadata: { keys: string[] };
}

export interface RequestArgs extends BaseRequestArgs {
  input: Map<string, any>;
}

export interface BaseRequest {
  table: string;
  operation: 'GET' | 'LIST' | 'CREATE' | 'UPDATE' | 'DELETE' | 'INDEX';
  operationName: string;
  args: BaseRequestArgs;
}

export interface Request extends BaseRequest {
  table: string;
  operation: 'GET' | 'LIST' | 'CREATE' | 'UPDATE' | 'DELETE' | 'INDEX';
  operationName: string;
  args: RequestArgs;
}

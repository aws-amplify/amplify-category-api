import { BaseRequest, BaseRequestArgs } from './BaseRequest';

export interface ListRequestArgs extends BaseRequestArgs {
  filter: Map<string, any>;
  limit: number;
  nextToken: string;
}

export interface ListRequest extends BaseRequest {
  table: string;
  operation: 'GET' | 'LIST' | 'CREATE' | 'UPDATE' | 'DELETE';
  operationName: string;
  args: ListRequestArgs;
}

import { BaseRequest, BaseRequestArgs } from './BaseRequest';

export enum SortDirection {
  ASC,
  DESC
}

export interface ListRequestArgs extends BaseRequestArgs {
  filter: Map<string, any>;
  limit: number;
  nextToken: string;
  sortDirection?: SortDirection;
}

export interface ListRequest extends BaseRequest {
  table: string;
  operation: 'LIST';
  operationName: string;
  args: ListRequestArgs;
}

export interface IndexRequestArgs extends ListRequestArgs {
  [key: string]: any;
}

export interface IndexRequest extends BaseRequest {
  table: string;
  operation: 'INDEX';
  operationName: string;
  args: IndexRequestArgs;
}

import { Knex } from 'knex';
import { Request } from '../interfaces/BaseRequest';
import { IndexRequest, ListRequest, SortDirection } from '../interfaces/ListRequest';

export abstract class DBClient {
  client: Knex;
  abstract getClient(): Promise<any | Knex<any, any[]>>;

  protected addKeyConditions = (query: any, request: Request) => {
    const keys = request.args.metadata.keys || [];
    keys.forEach((key) => {
      query.where(key, request.args.input[key]);
    });
  }

  protected addSortConditions = (query: any, request: ListRequest | IndexRequest) => {
    // order using sort keys
    const sortDirection = request.args.sortDirection || SortDirection.ASC;
    const keys = request.args.metadata.keys || [];
    if(keys.length > 1) {
      const sortKeys = request.args.metadata.keys.slice(1);
      const orderByConditions = sortKeys.map((sortKey) => {
        return {
          column: sortKey,
          order: sortDirection.toString().toLowerCase(),
        };
      });
      query.orderBy(orderByConditions);
    }
  }
}

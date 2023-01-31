import { Knex } from 'knex';
import { DBClient } from '../DBClient.js';
import { BaseRequest, Request } from '../../interfaces/BaseRequest.js';
import { ListRequest, SortDirection } from '../../interfaces/ListRequest';

export abstract class PostgresClient implements DBClient {
    client: Knex;
    abstract getClient(): Promise<any>;

    executeRequest = async (request: BaseRequest): Promise<any> => {
      const doExecute = async (): Promise<any> => {
        switch (request.operation) {
          case 'CREATE':
            return this.executeCreate(request as Request);
          case 'GET':
            return this.executeGet(request as Request);
          case 'UPDATE':
            return this.executeUpdate(request as Request);
          case 'LIST':
            return this.executeList(request as ListRequest);
          case 'DELETE':
            return this.executeDelete(request as Request);
          default:
            throw Error('Invalid operation');
        }
      };

      const result = await doExecute();
      const data = {};
      data[request.operationName] = result;
      return result;
    }

    private executeCreate = async (request: Request): Promise<any> => {
      const result = await (await this.getClient())(request.table).insert(request.args.input).returning('*');
      return result;
    }

    private executeGet = async (request: Request): Promise<any> => {
      const query = (await this.getClient())(request.table);
      this.addKeyConditions(query, request);
      const result = await query.select();
      return result ? result[0] : {};
    }

    private executeUpdate = async (request: Request): Promise<any> => {
      const query = (await this.getClient())(request.table);
      this.addKeyConditions(query, request);
      return query.update(request.args.input).returning('*');
    }

    private executeList = async (request: ListRequest): Promise<any> => {
      const nextOffset = Number.parseInt(Buffer.from(request.args.nextToken, 'base64').toString('base64'), 10);
      const query = (await this.getClient())(request.table).select().offset(nextOffset).limit(request.args.limit);
      if (request.args) {
        Object.keys(request.args.filter).filter((key) => request.args.hasOwnProperty(key)).forEach((key) => {
          query.whereLike(key, request.args.filter[key]);
        });
        this.addSortConditions(query, request);
      }
      const nextToken = Buffer.from((nextOffset + request.args.limit).toString());
      return { items: (await query.returning('*')), nextToken };
    }

    private executeDelete = async (request: Request): Promise<any> => {
      const query = (await this.getClient())(request.table);
      this.addKeyConditions(query, request);
      return query.delete().returning('*');
    }

    private addKeyConditions = (query: any, request: Request) => {
      const keys = request.args.metadata.keys || [];
      keys.map( key => {
        query.where(key, request.args.input.get(key));
      });
    }

    private addSortConditions = (query: any, request: ListRequest) => {
      // order using sort keys
      const sortDirection = request.args.sortDirection || SortDirection.ASC;
      const keys = request.args.metadata.keys || [];
      if(keys.length > 1) {
        const sortKeys = request.args.metadata.keys.slice(1);
        const orderByConditions = sortKeys.map( sortKey => {
          return {
            column: sortKey,
            order: sortDirection.toString().toLowerCase()
          }
        });
        query.orderBy(orderByConditions);
      }
    }
}

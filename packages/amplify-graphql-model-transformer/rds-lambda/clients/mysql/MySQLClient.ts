import { Knex } from 'knex';
import { DBClient } from '../DBClient';
import { BaseRequest, Request } from '../../interfaces/BaseRequest';
import { ListRequest, SortDirection } from '../../interfaces/ListRequest';

export abstract class MySQLClient implements DBClient {
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

    return doExecute();
  }

  private executeCreate = async (request: Request): Promise<any> => {
    await (await this.getClient())(request.table).insert(request.args.input);
    return request.args.input;
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
    return request.args.input;
  }

  private executeList = async (request: ListRequest): Promise<any> => {
    const nextOffset = request.args?.nextToken
      ? Number.parseInt(Buffer.from(request.args.nextToken, 'base64').toString('base64'), 10)
      : 0;
    const query = (await this.getClient())(request.table).select().offset(nextOffset).limit(request.args?.limit ?? 100);
    if (request.args?.filter) {
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
    Object.keys(request.args.input).filter((key) => request.args.input.hasOwnProperty(key)).forEach((key) => {
      query.whereLike(key, request.args.input[key]);
    });
    await query.delete();
    return request.args.input;
  }
}

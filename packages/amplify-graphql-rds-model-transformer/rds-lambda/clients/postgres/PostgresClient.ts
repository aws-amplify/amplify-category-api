import { Knex } from 'knex';
import { DBClient } from '../DBClient.js';
import { BaseRequest, Request } from '../../interfaces/BaseRequest.js';
import { ListRequest } from '../../interfaces/ListRequest';

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
      const query = (await this.getClient())(request.table).where('id', request.args.input.get('id')).select();
      const result = await query;
      return result ? result[0] : {};
    }

    private executeUpdate = async (request: Request): Promise<any> => {
      const query = (await this.getClient())(request.table).update(request.args.input);
      query.where('id', request.args.input.get('id'));
      return query.returning('*');
    }

    private executeList = async (request: ListRequest): Promise<any> => {
      const nextOffset = Number.parseInt(Buffer.from(request.args.nextToken, 'base64').toString('base64'), 10);
      const query = (await this.getClient())(request.table).select().offset(nextOffset).limit(request.args.limit);
      if (request.args) {
        Object.keys(request.args.filter).filter((key) => request.args.hasOwnProperty(key)).forEach((key) => {
          query.whereLike(key, request.args.filter[key]);
        });
      }
      const nextToken = Buffer.from((nextOffset + request.args.limit).toString());
      return { items: (await query.returning('*')), nextToken };
    }

    private executeDelete = async (request: Request): Promise<any> => {
      const query = (await this.getClient())(request.table).delete().where('id');
      return query.returning('*');
    }
}

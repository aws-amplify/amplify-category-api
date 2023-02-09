import { Knex } from 'knex';
import { DBClient } from '../DBClient';
import { BaseRequest, Request } from '../../interfaces/BaseRequest';
import { IndexRequest, ListRequest } from '../../interfaces/ListRequest';

export abstract class MySQLClient extends DBClient {
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
        case 'INDEX':
          return this.executeIndex(request as IndexRequest);
        default:
          throw Error('Invalid operation');
      }
    };

    return doExecute();
  }

  private executeCreate = async (request: Request): Promise<any> => {
    // Insert the record
    await (await this.getClient())(request.table).insert(request.args.input);

    // Select the record
    const resultQuery = (await this.getClient())(request.table);
    this.addKeyConditions(resultQuery, request);
    const result = await resultQuery.select();
    return result ? result[0] : {};
  }

  private executeGet = async (request: Request): Promise<any> => {
    const query = (await this.getClient())(request.table);
    this.addKeyConditions(query, request);
    const result = await query.select();
    return result ? result[0] : {};
  }

  private executeUpdate = async (request: Request): Promise<any> => {
    // Update the record
    const query = (await this.getClient())(request.table);
    this.addKeyConditions(query, request);
    await query.update(request.args.input);

    // Select the record
    const resultQuery = (await this.getClient())(request.table);
    this.addKeyConditions(resultQuery, request);
    const result = await resultQuery.select();
    return result ? result[0] : {};
  }

  private executeList = async (request: ListRequest): Promise<any> => {
    const nextOffset = request.args?.nextToken
      ? Number.parseInt(Buffer.from(request.args.nextToken, 'base64').toString('utf-8'), 10)
      : 0;
    const limit = request.args?.limit ?? 100;
    const query = (await this.getClient())(request.table).select().offset(nextOffset).limit(limit);

    this.addSortConditions(query, request);
    const result = await query.returning('*');
    const endOfResults = result?.length && result?.length < limit;
    const nextToken = endOfResults ? null : Buffer.from((nextOffset + request.args.limit).toString()).toString('base64');
    return { items: result, nextToken };
  }

  private executeDelete = async (request: Request): Promise<any> => {
    // Select the record
    const resultQuery = (await this.getClient())(request.table);
    this.addKeyConditions(resultQuery, request);
    const result = await resultQuery.select();

    // Delete the record
    const query = (await this.getClient())(request.table);
    Object.keys(request.args.input).filter((key) => request.args.input.hasOwnProperty(key)).forEach((key) => {
      query.where(key, request.args.input[key]);
    });
    await query.delete();

    return result ? result[0] : {};
  }

  private executeIndex = async (request: IndexRequest): Promise<any> => {
    const searchFilter = JSON.parse(JSON.stringify(request.args.input));
    ['filter', 'limit', 'nextToken', 'sortDirection'].forEach(key => {
      delete searchFilter[key];
    });
    const nextOffset = request.args?.nextToken
      ? Number.parseInt(Buffer.from(request.args.nextToken, 'base64').toString('utf-8'), 10)
      : 0;
    const limit = request.args?.limit ?? 100;
    const query = (await this.getClient())(request.table).where(searchFilter).select().offset(nextOffset).limit(limit);

    this.addSortConditions(query, request);
    const result = await query.returning('*');
    const endOfResults = result?.length && result?.length < limit;
    const nextToken = endOfResults ? null : Buffer.from((nextOffset + request.args.limit).toString()).toString('base64');
    return { items: result, nextToken };
  }
}

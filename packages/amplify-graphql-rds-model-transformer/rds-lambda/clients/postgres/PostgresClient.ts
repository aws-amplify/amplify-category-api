import {DBClient} from '../DBClient.js';
import {BaseRequest} from '../../interfaces/BaseRequest.js';
import {Knex} from 'knex';

export abstract class PostgresClient implements DBClient {
    client: Knex;
    abstract getClient(): Promise<any>;

    executeRequest = async (request: BaseRequest): Promise<any> => {
        console.log(`Op: ${request.operation}`);
        const doExecute = async () => {
            switch (request.operation) {
                case 'CREATE':
                    return (await this.executeCreate(request));
                case 'GET':
                    return (await this.executeGet(request));
                case 'UPDATE':
                    return (await this.executeUpdate(request));
                case 'LIST':
                    return (await this.executeList(request));
                case 'DELETE':
                    return (await this.executeDelete(request));
                default:
                    return;
            }
        };

        const result = await doExecute();
        const data = {};
        data[request.operationName] = result;
        return result;
    }

    private executeCreate = async (request: BaseRequest): Promise<any> => {
        const result = await (await this.getClient())(request.table).insert(request.args.input).returning('*');
        return result;
    }

    private executeGet = async (request: BaseRequest): Promise<any> => {
        const query = (await this.getClient())(request.table).where('id', request.args['id']).select();
        const result = await query;
        console.log(`Result: ${JSON.stringify(result)}`)
        return result ? result[0] : {};
        /**
        Object.keys(request.args).filter((key) => request.args.hasOwnProperty(key)).forEach((key) => {
            query.where(key, request.args[key]);
        });
        return (await query.returning('*').first); */
    }

    private executeUpdate = async (request: BaseRequest): Promise<any> => {
        const query = (await this.getClient())(request.table).update(request.args.input);
        query.where('id', request.args.input['id']);
        query.where('_version', request.args.input['_version']);
        return (await query.returning('*'));
    }

    private executeList = async (request: BaseRequest): Promise<any> => {
        const query = (await this.getClient())(request.table).select();
        if (request.args) {
            Object.keys(request.args).filter((key) => request.args.hasOwnProperty(key)).forEach((key) => {
                query.whereLike(key, request.args.input[key]);
            });
        }
        return {'items': (await query.returning('*')) };
    }

    private executeDelete = async (request: BaseRequest): Promise<any> => {
        const query = (await this.getClient())(request.table).delete().where('id');
        return (await query.returning('*'));
    }
}

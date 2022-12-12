import { Knex } from 'knex';

export interface DBClient {
    client: Knex;
    getClient(): Promise<any | Knex<any, any[]>>;
}

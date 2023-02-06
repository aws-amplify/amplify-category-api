import Knex from 'knex';
import { PostgresClient } from './PostgresClient';

/**
 * Postgres client with password connection implementation
 */
export class PostgresPasswordClient extends PostgresClient {
    private clientPromise: Promise<any>;
    constructor() {
      super();
      this.clientPromise = this.getClient();
      this.clientPromise.then((value) => this.client = value);
    }

    getClient = async (): Promise<any> => {
      if (this.client) {
        return this.client;
      }
      if (this.clientPromise) {
        await this.clientPromise;
        return this.client;
      }
      return Knex({
        client: 'pg',
        connection: {
          host: process.env.DATABASE_HOST,
          port: Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10),
          user: '',
          password: '',
          database: '',
        },
      });
    }
}

export const postgresPasswordClient = new PostgresPasswordClient();

import knex, { Knex } from 'knex';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { MySQLClient } from './MySQLClient';
import * as mysql2 from 'mysql2/promise';

/**
 * Postgres client with password connection implementation
 */
export class MySQLPasswordClient extends MySQLClient {
  private clientPromise: Promise<any>;
  constructor() {
    super();
    this.clientPromise = this.getClient();
    this.clientPromise.then((value) => { this.client = value; }).catch((e) => { throw (e); });
  }

  getClient = async (): Promise<any> => {
    if (this.client) {
      return this.client;
    }
    if (this.clientPromise) {
      await this.clientPromise;
      return this.client;
    }
    const passwordClient = this.getSSMClient();
    return knex({
      client: 'mysql2',
      connection: {
        host: await this.getSSMValue(passwordClient, process.env.host),
        port: Number.parseInt(await this.getSSMValue(passwordClient, process.env.port)) || 3306,
        user: await this.getSSMValue(passwordClient, process.env.username),
        password: await this.getSSMValue(passwordClient, process.env.password),
        database: process.env.database,
      },
    });
  }

  private getSSMClient(): SSMClient {
    return new SSMClient({});
  }

  private async getSSMValue(client: SSMClient, key: string | undefined): Promise<string> {
    if (!key) {
      throw Error('Key not provided to retrieve database connection secret');
    }
    const parameterCommand = new GetParameterCommand({
      Name: key,
      WithDecryption: true,
    });
    const data = await client.send(parameterCommand);
    if ((data.$metadata?.httpStatusCode && data?.$metadata?.httpStatusCode >= 400) || !data.Parameter?.Value) {
      throw new Error('Unable to get secret for database connection');
    }
    return data.Parameter?.Value ?? '';
  }
}

export const mySqlPasswordClient = new MySQLPasswordClient();

import Knex from 'knex';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { MySQLClient } from './MySQLClient.js';

/**
 * Postgres client with password connection implementation
 */
export class MySQLPasswordClient extends MySQLClient {
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
    const passwordClient = this.getSSMClient();
    return Knex({
      client: 'pg',
      connection: {
        host: process.env.host,
        port: Number.parseInt(process.env.port ?? '5432', 10),
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
      return '';
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

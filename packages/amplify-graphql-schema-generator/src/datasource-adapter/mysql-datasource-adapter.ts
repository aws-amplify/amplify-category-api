import { knex } from 'knex';
import { printer } from '@aws-amplify/amplify-prompts';
import { invokeSchemaInspectorLambda } from '../utils/vpc-helper';
import ora from 'ora';
import { Field, Index } from '../schema-representation';
import { DataSourceAdapter } from './datasource-adapter';
import { MySQLStringDataSourceAdapter } from './mysql-string-datasource-adapter';

const spinner = ora();
export interface MySQLDataSourceConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export class MySQLDataSourceAdapter extends DataSourceAdapter {
  private adapter: MySQLStringDataSourceAdapter;
  private dbBuilder: any;

  constructor(private config: MySQLDataSourceConfig) {
    super();
  }

  public async test(): Promise<boolean> {
    const TEST_QUERY = 'SELECT 1';
    if (!this.dbBuilder) {
      this.establishDBConnection();
    }
    try {
      await this.dbBuilder.raw(TEST_QUERY);
    } catch (error) {
      return false;
    }
    return true;
  }

  public async initialize(): Promise<void> {
    spinner.start('Fetching the database schema...');
    try {
      await this.establishDBConnection();
      const schema = await this.querySchema();
      this.adapter = new MySQLStringDataSourceAdapter(schema);
    } catch (error) {
      spinner.fail('Failed to fetch the database schema.');
      throw error;
    }
    spinner.succeed('Successfully fetched the database schema.');
  }

  private establishDBConnection(): void {
    const databaseConfig = {
      host: this.config.host,
      database: this.config.database,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      ssl: { rejectUnauthorized: false },
    };
    try {
      this.dbBuilder = knex({
        client: 'mysql2',
        connection: databaseConfig,
        pool: {
          min: 5,
          max: 30,
          createTimeoutMillis: 30000,
          acquireTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100,
        },
        debug: false,
      });
    } catch (err) {
      printer.info(err);
      throw err;
    }
  }

  public getTablesList(): string[] {
    return this.adapter.getTablesList();
  }

  public getFields(tableName: string): Field[] {
    return this.adapter.getFields(tableName);
  }

  public getPrimaryKey(tableName: string): Index | null {
    return this.adapter.getPrimaryKey(tableName);
  }

  public getIndexes(tableName: string): Index[] {
    return this.adapter.getIndexes(tableName);
  }

  protected async querySchema(): Promise<string> {
    const schemaQuery = getMySQLSchemaQuery(this.config.database);
    const result =
      this.useVPC && this.vpcSchemaInspectorLambda
        ? await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda, this.config, schemaQuery, this.vpcLambdaRegion)
        : (await this.dbBuilder.raw(schemaQuery))[0];
    return this.queryToCSV(result);
  }

  public cleanup(): void {
    this.dbBuilder && this.dbBuilder.destroy();
  }
}

export function getMySQLSchemaQuery(databaseName: string): string {
  return `
SELECT DISTINCT
  INFORMATION_SCHEMA.COLUMNS.TABLE_NAME,
  INFORMATION_SCHEMA.COLUMNS.COLUMN_NAME,
  INFORMATION_SCHEMA.COLUMNS.COLUMN_DEFAULT,
  INFORMATION_SCHEMA.COLUMNS.ORDINAL_POSITION,
  INFORMATION_SCHEMA.COLUMNS.DATA_TYPE,
  INFORMATION_SCHEMA.COLUMNS.COLUMN_TYPE,
  INFORMATION_SCHEMA.COLUMNS.IS_NULLABLE,
  INFORMATION_SCHEMA.COLUMNS.CHARACTER_MAXIMUM_LENGTH,
  INFORMATION_SCHEMA.STATISTICS.INDEX_NAME,
  INFORMATION_SCHEMA.STATISTICS.NON_UNIQUE,
  INFORMATION_SCHEMA.STATISTICS.SEQ_IN_INDEX,
  INFORMATION_SCHEMA.STATISTICS.NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
LEFT JOIN INFORMATION_SCHEMA.STATISTICS ON INFORMATION_SCHEMA.COLUMNS.TABLE_NAME=INFORMATION_SCHEMA.STATISTICS.TABLE_NAME AND INFORMATION_SCHEMA.COLUMNS.COLUMN_NAME=INFORMATION_SCHEMA.STATISTICS.COLUMN_NAME
WHERE INFORMATION_SCHEMA.COLUMNS.TABLE_SCHEMA = '${databaseName}'
`;
}

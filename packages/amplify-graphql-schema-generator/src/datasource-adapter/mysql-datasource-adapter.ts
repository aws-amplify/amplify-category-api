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
      const schema =
        JSON.stringify(await this.queryAllFields()) +
        JSON.stringify(await this.queryAllIndexes()) +
        JSON.stringify(await this.queryAllTables());
      new MySQLStringDataSourceAdapter(schema);
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

  public async getTablesList(): Promise<string[]> {
    return this.adapter.getTablesList();
  }

  public async getFields(tableName: string): Promise<Field[]> {
    return this.adapter.getFields(tableName);
  }

  public async getPrimaryKey(tableName: string): Promise<Index | null> {
    return this.adapter.getPrimaryKey(tableName);
  }

  public async getIndexes(tableName: string): Promise<Index[]> {
    return this.adapter.getIndexes(tableName);
  }

  private async queryAllTables(): Promise<any> {
    const SHOW_TABLES_QUERY = 'SHOW TABLES';
    const result =
      this.useVPC && this.vpcSchemaInspectorLambda
        ? await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda, this.config, SHOW_TABLES_QUERY, this.vpcLambdaRegion)
        : (await this.dbBuilder.raw(SHOW_TABLES_QUERY))[0];
    return result;
  }

  private async queryAllFields(): Promise<any> {
    // Query INFORMATION_SCHEMA.COLUMNS table and load fields of all the tables from the database
    const LOAD_FIELDS_QUERY = `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${this.config.database}'`;
    const columnResult =
      this.useVPC && this.vpcSchemaInspectorLambda
        ? await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda, this.config, LOAD_FIELDS_QUERY, this.vpcLambdaRegion)
        : (await this.dbBuilder.raw(LOAD_FIELDS_QUERY))[0];
    return columnResult;
  }

  private async queryAllIndexes(): Promise<any> {
    // Query INFORMATION_SCHEMA.STATISTICS table and load indexes of all the tables from the database
    const LOAD_INDEXES_QUERY = `SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = '${this.config.database}'`;
    const indexResult =
      this.useVPC && this.vpcSchemaInspectorLambda
        ? await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda, this.config, LOAD_INDEXES_QUERY, this.vpcLambdaRegion)
        : (await this.dbBuilder.raw(LOAD_INDEXES_QUERY))[0];
    return indexResult;
  }

  public cleanup(): void {
    this.dbBuilder && this.dbBuilder.destroy();
  }
}

import { knex } from 'knex';
import ora from 'ora';
import { Field, Index } from '../schema-representation';
import { getSSLConfig } from '../utils';
import { invokeSchemaInspectorLambda } from '../utils/vpc-helper';
import { DataSourceAdapter, DataSourceConfig } from './datasource-adapter';
import { expectedColumns, PostgresStringDataSourceAdapter } from './pg-string-datasource-adapter';

const spinner = ora();

export class PostgresDataSourceAdapter extends DataSourceAdapter {
  private adapter: PostgresStringDataSourceAdapter;

  private dbBuilder: any;

  constructor(private config: DataSourceConfig) {
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
      this.adapter = new PostgresStringDataSourceAdapter(schema);
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
      ssl: getSSLConfig(this.config.host, this.config.sslCertificate),
    };
    try {
      this.dbBuilder = knex({
        client: 'pg',
        connection: databaseConfig,
        pool: {
          min: 1,
          max: 1,
          createTimeoutMillis: 30000,
          acquireTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100,
        },
        debug: false,
      });
    } catch (err) {
      console.info(err);
      throw err;
    }
  }

  public getTablesList(): string[] {
    return this.adapter.getTablesList();
  }

  protected async querySchema(): Promise<string> {
    const schemaQuery = getPostgresSchemaQuery(this.config.database);
    const result =
      this.useVPC && this.vpcSchemaInspectorLambda
        ? await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda, this.config, schemaQuery, this.vpcLambdaRegion)
        : (await this.dbBuilder.raw(schemaQuery)).rows;

    return this.queryToCSV(result);
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

  public cleanup(): void {
    this.dbBuilder && this.dbBuilder.destroy();
  }
}

export function getPostgresSchemaQuery(databaseName: string): string {
  return `
SELECT DISTINCT
  INFORMATION_SCHEMA.COLUMNS.table_name,
  ${expectedColumns.filter((column) => !(column === 'index_columns' || column === 'table_name')).join(',')},
  REPLACE(SUBSTRING(indexdef from '\\((.*)\\)'), '"', '') as index_columns
FROM INFORMATION_SCHEMA.COLUMNS
LEFT JOIN pg_indexes
ON
  INFORMATION_SCHEMA.COLUMNS.table_name = pg_indexes.tablename
  AND INFORMATION_SCHEMA.COLUMNS.column_name = ANY(STRING_TO_ARRAY(REPLACE(SUBSTRING(indexdef from '\\((.*)\\)'), '"', ''), ', '))
  LEFT JOIN (
    SELECT
      t.typname AS enum_name,
      ARRAY_AGG(e.enumlabel) as enum_values
    FROM    pg_type t JOIN
      pg_enum e ON t.oid = e.enumtypid JOIN
      pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE   n.nspname = 'public'
    GROUP BY enum_name
  ) enums
  ON enums.enum_name = INFORMATION_SCHEMA.COLUMNS.udt_name
  LEFT JOIN information_schema.table_constraints
  ON INFORMATION_SCHEMA.table_constraints.constraint_name = indexname
  AND INFORMATION_SCHEMA.COLUMNS.table_name = INFORMATION_SCHEMA.table_constraints.table_name
WHERE INFORMATION_SCHEMA.COLUMNS.table_schema = 'public' AND INFORMATION_SCHEMA.COLUMNS.TABLE_CATALOG = '${databaseName}';
`;
}

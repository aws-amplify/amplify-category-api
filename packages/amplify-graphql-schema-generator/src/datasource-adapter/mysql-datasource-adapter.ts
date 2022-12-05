import { Field, Index } from "../schema-representation";
import { DataSourceAdapter } from "./datasource-adapter";
import { knex } from 'knex';
import { printer } from 'amplify-prompts';

interface MySQLDataSourceConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
}

interface MySQLIndex {
  tableName: string;
  nonUnique: number;
  indexName: string;
  sequence: number;
  columnName: string;
  nullable: boolean;  
}

export class MySQLDataSourceAdapter extends DataSourceAdapter {
  private dbBuilder: any;
  private indexes: MySQLIndex[] = [];
  private readonly PRIMARY_KEY_INDEX_NAME = 'PRIMARY';

  constructor(private config: MySQLDataSourceConfig) {
    super();
    this.establishDBConnection();
    this.loadAllIndexes();
  }

  private establishDBConnection() {
    const databaseConfig = {
      host: this.config.host,
      database: this.config.database,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      ssl: { rejectUnauthorized: false},
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
          createRetryIntervalMillis: 100
        },
        debug: false,
      });
    }
    catch(err) {
      printer.info(err);
      throw err;
    }
  }

  public async getTablesList(): Promise<string[]> {
    let result = (await this.dbBuilder.raw("SHOW TABLES"))[0];
    const tables: string[] = [];

    for (const row of result) {
      const [firstKey] = Object.keys(row);
      const tableName = row[firstKey];
      tables.push(tableName);
    }

    return tables;
  }

  public async getFields(tableName: string): Promise<Field[]> {
    const fields: Field[] = [];
    let columnResult = (await this.dbBuilder.raw(`SHOW COLUMNS FROM ${tableName}`))[0];
    for (const item of columnResult) {
      const field: any = {
        name: item["Field"],
        type: item["Type"], // TODO: Datatype mapping is required here
      };
      if (item["Default"]) {
        field.default = item["Default"];
      }
      fields.push(field);
    }
    return fields;
  }

  private async loadAllIndexes(): Promise<void> {
    this.indexes = [];
    // Query INFORMATION_SCHEMA.STATISTICS table and load indexes of all the tables from the database
    let indexResult = (await this.dbBuilder.raw(`SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = '${this.config.database}'`))[0];
    for (const item of indexResult) {
      const index: MySQLIndex = {
        tableName: item["TABLE_NAME"],
        indexName: item["INDEX_NAME"],
        nonUnique: item["NON_UNIQUE"],
        columnName: item["COLUMN_NAME"],
        sequence: item["SEQ_IN_INDEX"],
        nullable: item["NULLABLE"] === 'YES' ? true : false,
      };
      this.indexes.push(index);
    }
  }

  public async getPrimaryKey(tableName: string): Promise<Index | null> {
    const key = this.indexes
      .filter(index => index.tableName == tableName && index.indexName === this.PRIMARY_KEY_INDEX_NAME)
      .sort((a,b) => a.sequence - b.sequence);

    if (!key || key.length == 0) {
      return null;
    }
    
    const index: Index = new Index(key[0].indexName);
    index.setFields(key.map(k => k.columnName));

    return index;
  }

  public async getIndexes(tableName: string): Promise<Index[]> {
    const tableIndexes: Index[] = [];
    const indexNames: string[] = [...new Set(this.indexes
      .filter(i => i.tableName === tableName && i.indexName !== this.PRIMARY_KEY_INDEX_NAME).map(i => i.indexName))]; 
    
    for (const indexName of indexNames) {
      const key = this.indexes
        .filter(index => index.tableName == tableName && index.indexName === indexName)
        .sort((a,b) => a.sequence - b.sequence);
      const index: Index = new Index(indexName);
      index.setFields(key.map(k => k.columnName));
      tableIndexes.push(index);
    }

    return tableIndexes;
  }

  public cleanup(): void {
    this.dbBuilder && this.dbBuilder.destroy();
  }
}

import { DefaultType, Field, FieldDataType, FieldType, Index } from "../schema-representation";
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

interface MySQLColumn {
  tableName: string;
  columnName: string;
  sequence: number;
  default: string;
  datatype: string;
  nullable: boolean;  
  length: number | null | undefined;  
}

export class MySQLDataSourceAdapter extends DataSourceAdapter {
  private dbBuilder: any;
  private indexes: MySQLIndex[] = [];
  private fields: MySQLColumn[] = [];
  private readonly PRIMARY_KEY_INDEX_NAME = 'PRIMARY';

  constructor(private config: MySQLDataSourceConfig) {
    super();
  }
  
  public async initialize(): Promise<void> {
    await this.establishDBConnection();
    await this.loadAllFields();
    await this.loadAllIndexes();
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
    
    const tables: string[] = result.map((row: any) => {
      const [firstKey] = Object.keys(row);
      const tableName = row[firstKey];
      return tableName;
    });
    
    return tables;
  }

  public async getFields(tableName: string): Promise<Field[]> {
    const fieldsName: string[] = [...new Set(this.fields
      .filter(f => f.tableName === tableName)
      .sort((a,b) => a.sequence - b.sequence)
      .map(f => f.columnName))]; 
    
    const modelFields = fieldsName.map(columnName => {
      const dbField = this.fields
        .find(field => field.tableName === tableName && field.columnName === columnName)!;
      const field: Field = {
        name: dbField.columnName,
        type: this.mapDataType(dbField.datatype, dbField.nullable),
        length: dbField.length,
        default: dbField.default ? {
          kind: 'DB_GENERATED',
          value: dbField.default,
        } : undefined,
      };
      return field;
    });

    return modelFields;
  }

  private async loadAllFields(): Promise<void> {
    this.fields = [];
    // Query INFORMATION_SCHEMA.COLUMNS table and load fields of all the tables from the database
    let columnResult = (await this.dbBuilder.raw(`SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${this.config.database}'`))[0];
    this.fields = columnResult.map((item: any) => {
      return {
        tableName: item["TABLE_NAME"],
        columnName: item["COLUMN_NAME"],
        default: item["COLUMN_DEFAULT"],
        sequence: item["ORDINAL_POSITION"],
        datatype: item["DATA_TYPE"],
        nullable: item["IS_NULLABLE"] === 'YES' ? true : false,
        length: item["CHARACTER_MAXIMUM_LENGTH"],
      };
    });
  }

  private async loadAllIndexes(): Promise<void> {
    this.indexes = [];
    // Query INFORMATION_SCHEMA.STATISTICS table and load indexes of all the tables from the database
    let indexResult = (await this.dbBuilder.raw(`SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = '${this.config.database}'`))[0];
    this.indexes = indexResult.map((item: any) => {
      return {
        tableName: item["TABLE_NAME"],
        indexName: item["INDEX_NAME"],
        nonUnique: item["NON_UNIQUE"],
        columnName: item["COLUMN_NAME"],
        sequence: item["SEQ_IN_INDEX"],
        nullable: item["NULLABLE"] === 'YES' ? true : false,
      };
    });
  }

  public async getPrimaryKey(tableName: string): Promise<Index | null> {
    const key = this.indexes
      .filter(index => index.tableName === tableName && index.indexName === this.PRIMARY_KEY_INDEX_NAME)
      .sort((a,b) => a.sequence - b.sequence);

    if (!key || key.length == 0) {
      return null;
    }
    
    const index: Index = new Index(key[0].indexName);
    index.setFields(key.map(k => k.columnName));

    return index;
  }

  public async getIndexes(tableName: string): Promise<Index[]> {
    const indexNames: string[] = [...new Set(this.indexes
      .filter(i => i.tableName === tableName && i.indexName !== this.PRIMARY_KEY_INDEX_NAME).map(i => i.indexName))]; 
    
    const tableIndexes = indexNames.map((indexName: string) => {
      const key = this.indexes
        .filter(index => index.tableName == tableName && index.indexName === indexName)
        .sort((a,b) => a.sequence - b.sequence);
      const index: Index = new Index(indexName);
      index.setFields(key.map(k => k.columnName));
      return index;
    });

    return tableIndexes;
  }

  public cleanup(): void {
    this.dbBuilder && this.dbBuilder.destroy();
  }
  
  public mapDataType(type: string, nullable: boolean): FieldType {
    let datatype: FieldDataType = 'String';
    let listtype = false;

    switch (type.toUpperCase()) {
      case 'VARCHAR':
      case 'CHAR':
      case 'BINARY':
      case 'VARBINARY':
      case 'TINYBLOB':
      case 'TINYTEXT':
      case 'TEXT':
      case 'BLOB':
      case 'MEDIUMTEXT':
      case 'MEDIUMBLOB':
      case 'LONGTEXT':
      case 'LONGBLOB':
      case 'ENUM':
        datatype = 'String';
        break;
      case 'SET':
        datatype = 'String';
        listtype = true;
        break;
      case 'BOOLEAN':
      case 'BOOL':
        datatype = 'Boolean';
        break;
      case 'BIT':
      case 'TINYINT':
      case 'SMALLINT':
      case 'MEDIUMINT':
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
      case 'YEAR':
        datatype = 'Int';
        break;
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
      case 'DEC':
      case 'NUMERIC':
        datatype = 'Float';
        break;
      case 'DATE':
        datatype = 'AWSDate';
        break;
      case 'DATETIME':
        datatype = 'AWSDateTime';
        break;
      case 'TIMESTAMP':
        datatype = 'AWSTimestamp';
        break;
      case 'TIME':
        datatype = 'AWSTime';
        break;
      case 'JSON':
        datatype = 'AWSJSON';
        break;
      default:
        datatype = 'String';
        break;
    }

    let result: FieldType = {
      kind: 'Scalar',
      name: datatype,
    };

    if (!nullable) {
      result = {
        kind: 'NonNull',
        type: result,
      };
    }

    return result;
  }
}

import { EnumType, Field, FieldDataType, FieldType, Index } from "../schema-representation";
import { DataSourceAdapter } from "./datasource-adapter";
import { knex } from 'knex';
import { printer } from '@aws-amplify/amplify-prompts';
import { invokeSchemaInspectorLambda } from "../utils/vpc-helper";
import ora from 'ora';

const spinner = ora();
export interface MySQLDataSourceConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
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
  columnType: string;
  nullable: boolean;
  length: number | null | undefined;
}

export class MySQLDataSourceAdapter extends DataSourceAdapter {
  private dbBuilder: any;
  private indexes: MySQLIndex[] = [];
  private fields: MySQLColumn[] = [];
  private enums: Map<string, EnumType> = new Map<string, EnumType>();
  private readonly PRIMARY_KEY_INDEX_NAME = 'PRIMARY';

  constructor(private config: MySQLDataSourceConfig) {
    super();
  }

  public async initialize(): Promise<void> {
    spinner.start('Fetching the database schema...');
    try {
      await this.establishDBConnection();
      await this.loadAllFields();
      await this.loadAllIndexes();
    }
    catch(error) {
      spinner.fail('Failed to fetch the database schema.');
      throw error;
    }
    spinner.succeed('Successfully fetched the database schema.');
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
    const SHOW_TABLES_QUERY = `SHOW TABLES`;
    let result;
    if (this.useVPC) {
      result = await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda!, this.config, SHOW_TABLES_QUERY, this.vpcLambdaRegion);
    }
    else {
      result = (await this.dbBuilder.raw(SHOW_TABLES_QUERY))[0];
    }

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
        type: this.mapDataType(dbField.datatype, dbField.nullable, tableName, dbField.columnName, dbField.columnType),
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
    // Query INFORMATION_SCHEMA.COLUMNS table and load fields of all the tables from the database
    const LOAD_FIELDS_QUERY = `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${this.config.database}'`;
    this.fields = [];
    let columnResult;
    if (this.useVPC) {
      columnResult = await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda!, this.config, LOAD_FIELDS_QUERY, this.vpcLambdaRegion);
    }
    else {
      columnResult = (await this.dbBuilder.raw(LOAD_FIELDS_QUERY))[0];
    }
    this.setFields(columnResult);
  }

  private setFields(fields: any): void {
    this.fields = fields.map((item: any) => {
      return {
        tableName: item["TABLE_NAME"],
        columnName: item["COLUMN_NAME"],
        default: item["COLUMN_DEFAULT"],
        sequence: item["ORDINAL_POSITION"],
        datatype: item["DATA_TYPE"],
        columnType: item["COLUMN_TYPE"],
        nullable: item["IS_NULLABLE"] === 'YES',
        length: item["CHARACTER_MAXIMUM_LENGTH"],
      };
    });
  }

  private async loadAllIndexes(): Promise<void> {
    // Query INFORMATION_SCHEMA.STATISTICS table and load indexes of all the tables from the database
    const LOAD_INDEXES_QUERY = `SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = '${this.config.database}'`;
    this.indexes = [];
    let indexResult;
    if (this.useVPC) {
      indexResult = await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda!, this.config, LOAD_INDEXES_QUERY, this.vpcLambdaRegion);
    }
    else {
      indexResult = (await this.dbBuilder.raw(LOAD_INDEXES_QUERY))[0];
    }
    
    this.setIndexes(indexResult);
  }

  private setIndexes(indexes: any): void {
    this.indexes = indexes.map((item: any) => {
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

  public mapDataType(datatype: string, nullable: boolean, tableName: string, fieldName:string, columntype: string): FieldType {
    let fieldDatatype: FieldDataType = 'String';
    let listtype = false;

    switch (datatype.toUpperCase()) {
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
        fieldDatatype = 'String';
        break;
      case 'SET':
        fieldDatatype = 'String';
        listtype = true;
        break;
      case 'BOOLEAN':
      case 'BOOL':
        fieldDatatype = 'Boolean';
        break;
      case 'BIT':
      case 'TINYINT':
      case 'SMALLINT':
      case 'MEDIUMINT':
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
      case 'YEAR':
        fieldDatatype = 'Int';
        break;
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
      case 'DEC':
      case 'NUMERIC':
        fieldDatatype = 'Float';
        break;
      case 'DATE':
        fieldDatatype = 'AWSDate';
        break;
      case 'TIMESTAMP':
      case 'DATETIME':
        fieldDatatype = 'AWSDateTime';
        break;
      case 'TIME':
        fieldDatatype = 'AWSTime';
        break;
      case 'JSON':
        fieldDatatype = 'AWSJSON';
        break;
      case 'ENUM':
        fieldDatatype = 'ENUM';
        break;
      default:
        fieldDatatype = 'String';
        break;
    }

    let result: FieldType;
    if (fieldDatatype === 'ENUM') {
      const enumName = this.generateEnumName(tableName, fieldName);
      result = {
        kind: 'Enum',
        values: this.getEnumValues(columntype),
        name: this.generateEnumName(tableName, fieldName),
      };
      this.enums.set(enumName, result);
    }
    else {
      result = {
        kind: 'Scalar',
        name: fieldDatatype,
      };
    }

    if (!nullable) {
      result = {
        kind: 'NonNull',
        type: result,
      };
    }

    return result;
  }

  private getEnumValues(value: string): string[] {
    // RegEx matches strings with quotes 'match' or "match"
    const regex = /(["'])(?:(?=(\\?))\2.)*?\1/g;
    // Remove the first and last character from the matched string which contains the quote
    return value.match(regex).map(a => a.slice(1, -1));
  }

  private generateEnumName(tableName: string, fieldName: string) {
    const enumNamePrefix = [tableName, fieldName].join("_");
    let enumName = enumNamePrefix;
    let counter = 0;
    while (this.enums.has(enumName)) {
      enumName = [enumNamePrefix, counter.toString()].join("_");
      counter++;
    }
    return enumName;
  }
}

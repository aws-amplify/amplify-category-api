import { knex } from 'knex';
import { printer } from '@aws-amplify/amplify-prompts';
import { invokeSchemaInspectorLambda } from '../utils/vpc-helper';
import ora from 'ora';
import { EnumType, Field, FieldDataType, FieldType, Index } from '../schema-representation';
import { DataSourceAdapter } from './datasource-adapter';

const spinner = ora();

export interface PostgresDataSourceConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

interface PostgresIndex {
  tableName: string;
  indexName: string;
  columns: string[];
}

interface PostgresColumn {
  tableName: string;
  columnName: string;
  sequence: number;
  default: string;
  datatype: string;
  columnType: string;
  nullable: boolean;
  length: number | null | undefined;
}

export class PostgresDataSourceAdapter extends DataSourceAdapter {
  private dbBuilder: any;

  private indexes: PostgresIndex[] = [];

  private fields: PostgresColumn[] = [];

  private enums: Map<string, EnumType> = new Map<string, EnumType>();

  private readonly PRIMARY_KEY_INDEX_NAME = 'PRIMARY';

  constructor(private config: PostgresDataSourceConfig) {
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
      await this.loadAllFields();
      await this.loadAllIndexes();
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
      printer.info(err);
      throw err;
    }
  }

  public async getTablesList(): Promise<string[]> {
    const SHOW_TABLES_QUERY = `SELECT table_name from information_schema.tables WHERE table_schema = 'public' AND TABLE_CATALOG = '${this.config.database}'`;
    const result =
      this.useVPC && this.vpcSchemaInspectorLambda
        ? await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda, this.config, SHOW_TABLES_QUERY, this.vpcLambdaRegion)
        : (await this.dbBuilder.raw(SHOW_TABLES_QUERY)).rows;

    const tables: string[] = result.map((row: any) => {
      const [firstKey] = Object.keys(row);
      const tableName = row[firstKey];
      return tableName;
    });
    return tables;
  }

  public async getFields(tableName: string): Promise<Field[]> {
    const fieldsName: string[] = [
      ...new Set(
        this.fields
          .filter((f) => f.tableName === tableName)
          .sort((a, b) => a.sequence - b.sequence)
          .map((f) => f.columnName),
      ),
    ];

    const modelFields = fieldsName.map((columnName) => {
      const dbField = this.fields.find((field) => field.tableName === tableName && field.columnName === columnName)!;
      const field: Field = {
        name: dbField.columnName,
        type: this.mapDataType(dbField.datatype, dbField.nullable, tableName, dbField.columnName, dbField.columnType),
        length: dbField.length,
        default: dbField.default
          ? {
              kind: 'DB_GENERATED',
              value: dbField.default,
            }
          : undefined,
      };
      return field;
    });

    return modelFields;
  }

  private async loadAllFields(): Promise<void> {
    // Query INFORMATION_SCHEMA.COLUMNS table and load fields of all the tables from the database
    const LOAD_FIELDS_QUERY = `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_schema = 'public' AND TABLE_CATALOG = '${this.config.database}'`;
    this.fields = [];
    const columnResult =
      this.useVPC && this.vpcSchemaInspectorLambda
        ? await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda, this.config, LOAD_FIELDS_QUERY, this.vpcLambdaRegion)
        : (await this.dbBuilder.raw(LOAD_FIELDS_QUERY)).rows;
    this.setFields(columnResult);
  }

  private setFields(fields: any): void {
    this.fields = fields.map((item: any) => ({
      tableName: item.table_name,
      columnName: item.column_name,
      default: item.column_default,
      sequence: item.ordinal_position,
      datatype: item.data_type,
      columnType: item.udt_name,
      nullable: item.is_nullable === 'YES',
      length: item.character_maximum_length,
    }));
  }

  private async loadAllIndexes(): Promise<void> {
    // Query pg_indexes table and load indexes of all the tables from the database
    const LOAD_INDEXES_QUERY = 'SELECT * FROM pg_indexes WHERE schemaname = \'public\'';
    this.indexes = [];
    const indexResult =
      this.useVPC && this.vpcSchemaInspectorLambda
        ? await invokeSchemaInspectorLambda(this.vpcSchemaInspectorLambda, this.config, LOAD_INDEXES_QUERY, this.vpcLambdaRegion)
        : (await this.dbBuilder.raw(LOAD_INDEXES_QUERY)).rows;
    this.setIndexes(indexResult);
  }

  private setIndexes(indexes: any): void {
    this.indexes = indexes.map((item: any) => ({
      tableName: item.tablename,
      columns: this.getFieldsFromDDL(item.indexdef),
      indexName: item.indexname,
    }));
  }

  private getFieldsFromDDL(ddl: string): string[] {
    const fieldsString = ddl.match(/\((.*?)\)/);
    if (fieldsString) {
        return fieldsString[1].split(',');
    }
    throw new Error('Could not parse fields from DDL'); 
  }

  public async getPrimaryKey(tableName: string): Promise<Index | null> {
    const key = this.indexes
      .find((index) => index.tableName === tableName && index.indexName === `${tableName}_pkey`);

    if (!key || key.columns.length == 0) {
      return null;
    }

    const index: Index = new Index(key.indexName);
    index.setFields(key.columns);

    return index;
  }

  public async getIndexes(tableName: string): Promise<Index[]> {
    const indexNames: string[] = [
      ...new Set(
        this.indexes.filter((i) => i.tableName === tableName && i.indexName !== `${tableName}_pkey`).map((i) => i.indexName),
      ),
    ];

    const tableIndexes = indexNames.map((indexName: string) => {
      const key = this.indexes
        .find((index) => index.tableName == tableName && index.indexName === indexName);
      const index: Index = new Index(indexName);
      index.setFields(key.columns);
      return index;
    });

    return tableIndexes;
  }

  public cleanup(): void {
    this.dbBuilder && this.dbBuilder.destroy();
  }

  public mapDataType(datatype: string, nullable: boolean, tableName: string, fieldName: string, columntype: string): FieldType {
    let fieldDatatype: FieldDataType = 'String';
    let listtype = false;

    if (columntype.startsWith('_')) {
      listtype = true;
      columntype = columntype.slice(1);
    }

    switch (columntype.toUpperCase()) {
      case 'VARCHAR':
      case 'CHAR':
      case 'TEXT':
        fieldDatatype = 'String';
        break;
      case 'BOOLEAN':
      case 'BOOL':
        fieldDatatype = 'Boolean';
        break;
      case 'BIGINT':
      case 'INT8':
      case 'BIGSERIAL':
      case 'BIT':
      case 'INT':
      case 'INT4':
      case 'INT2':
      case 'SMALLINT':
      case 'SMALLSERIAL':
      case 'SERIAL':
      case 'SERIAL4':
        fieldDatatype = 'Int';
        break;
      case 'FLOAT8':
      case 'MONEY':
      case 'NUMERIC':
      case 'DECIMAL':
      case 'REAL':
      case 'FLOAT4':
        fieldDatatype = 'Float';
        break;
      case 'UUID':
        fieldDatatype = 'ID';
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
      case 'BOX':
      case 'CIRCLE':
      case 'JSON':
      case 'JSONB':
      case 'LINE':
      case 'LSEG':
      case 'PATH':
      case 'POINT':
      case 'POLYGON':
        fieldDatatype = 'AWSJSON';
        break;
      case 'ENUM':
        fieldDatatype = 'ENUM';
        break;
      case 'CIDR':
      case 'INET':
        fieldDatatype = 'AWSIPAddress';
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
    } else {
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

    if (listtype) {
      result = {
        kind: 'List',
        type: result,
      };
    }

    return result;
  }

  private getEnumValues(value: string): string[] {
    // RegEx matches strings with quotes 'match' or "match"
    const regex = /(["'])(?:(?=(\\?))\2.)*?\1/g;
    // Remove the first and last character from the matched string which contains the quote
    return value.match(regex).map((a) => a.slice(1, -1));
  }

  private generateEnumName(tableName: string, fieldName: string): string {
    const enumNamePrefix = [tableName, fieldName].join('_');
    let enumName = enumNamePrefix;
    let counter = 0;
    while (this.enums.has(enumName)) {
      enumName = [enumNamePrefix, counter.toString()].join('_');
      counter++;
    }
    return enumName;
  }
}

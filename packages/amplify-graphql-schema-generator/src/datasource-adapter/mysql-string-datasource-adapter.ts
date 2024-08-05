import { EnumType, Field, FieldDataType, FieldType, Index } from '../schema-representation';
import { EmptySchemaError, InvalidSchemaError, StringDataSourceAdapter } from './string-datasource-adapter';

export interface MySQLIndex {
  tableName: string;
  nonUnique: number;
  indexName: string;
  sequence: number;
  columnName: string;
  nullable: boolean;
}

export interface MySQLColumn {
  tableName: string;
  columnName: string;
  sequence: number;
  default: string;
  datatype: string;
  columnType: string;
  nullable: boolean;
  length: number | null | undefined;
}

type MySQLSchema = MySQLSchemaField[];

type MySQLSchemaField = {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  COLUMN_DEFAULT: string;
  ORDINAL_POSITION: string;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: string;
  CHARACTER_MAXIMUM_LENGTH: string;
  INDEX_NAME: string;
  NON_UNIQUE: string;
  SEQ_IN_INDEX: string;
  NULLABLE: string;
};
const expectedColumns = [
  'TABLE_NAME',
  'COLUMN_NAME',
  'COLUMN_DEFAULT',
  'ORDINAL_POSITION',
  'DATA_TYPE',
  'COLUMN_TYPE',
  'IS_NULLABLE',
  'CHARACTER_MAXIMUM_LENGTH',
  'INDEX_NAME',
  'NON_UNIQUE',
  'SEQ_IN_INDEX',
  'NULLABLE',
];

export class MySQLStringDataSourceAdapter extends StringDataSourceAdapter {
  private dbBuilder: any;

  private indexes: MySQLIndex[];

  private fields: MySQLColumn[];

  private tables: string[];

  private enums: Map<string, EnumType> = new Map<string, EnumType>();

  private readonly PRIMARY_KEY_INDEX_NAME = 'PRIMARY';

  protected setSchema(schema: MySQLSchema): void {
    this.setFields(schema);
    this.setIndexes(schema);
    this.setTables(schema);
  }

  protected validateSchema(schema: any[]): schema is MySQLSchema {
    if (schema.length === 0) {
      throw new EmptySchemaError();
    }
    const columns = Object.keys(schema[0]);
    const hasAllExpectedColumns = expectedColumns.every((column) => columns.includes(column));
    if (!hasAllExpectedColumns) {
      throw new InvalidSchemaError(schema, expectedColumns);
    }

    return true;
  }

  protected setFields(parsedSchema: MySQLSchema): void {
    this.fields = parsedSchema.map((item: any) => ({
      tableName: item.TABLE_NAME,
      columnName: item.COLUMN_NAME,
      default: item.COLUMN_DEFAULT,
      sequence: item.ORDINAL_POSITION,
      datatype: item.DATA_TYPE,
      columnType: item.COLUMN_TYPE,
      nullable: item.IS_NULLABLE === 'YES',
      length: item.CHARACTER_MAXIMUM_LENGTH,
    }));
  }

  protected setIndexes(parsedSchema: MySQLSchema): void {
    this.indexes = parsedSchema
      .filter(({ INDEX_NAME }) => !!INDEX_NAME)
      .map((item: any) => ({
        tableName: item.TABLE_NAME,
        indexName: item.INDEX_NAME,
        nonUnique: item.NON_UNIQUE,
        columnName: item.COLUMN_NAME,
        sequence: item.SEQ_IN_INDEX,
        nullable: item.NULLABLE === 'YES',
      }));
  }

  protected setTables(parsedSchema: MySQLSchema): void {
    this.tables = Array.from(new Set(parsedSchema.map(({ TABLE_NAME }) => TABLE_NAME)));
  }

  public getTablesList(): string[] {
    return this.tables;
  }

  public getFields(tableName: string): Field[] {
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

  public getPrimaryKey(tableName: string): Index | null {
    const key = this.indexes
      .filter((index) => index.tableName === tableName && index.indexName === this.PRIMARY_KEY_INDEX_NAME)
      .sort((a, b) => a.sequence - b.sequence);

    if (!key || key.length == 0) {
      return null;
    }

    const index: Index = new Index(key[0].indexName);
    index.setFields(key.map((k) => k.columnName));

    return index;
  }

  public getIndexes(tableName: string): Index[] {
    const indexNames: string[] = [
      ...new Set(
        this.indexes.filter((i) => i.tableName === tableName && i.indexName !== this.PRIMARY_KEY_INDEX_NAME).map((i) => i.indexName),
      ),
    ];

    const tableIndexes = indexNames.map((indexName: string) => {
      const key = this.indexes
        .filter((index) => index.tableName == tableName && index.indexName === indexName)
        .sort((a, b) => a.sequence - b.sequence);
      const index: Index = new Index(indexName);
      index.setFields(key.map((k) => k.columnName));
      return index;
    });

    return tableIndexes;
  }

  public mapDataType(datatype: string, nullable: boolean, tableName: string, fieldName: string, columntype: string): FieldType {
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

    return result;
  }

  private getEnumValues(value: string): string[] {
    // RegEx matches strings with quotes 'match' or "match"
    const regex = /(["'])(?:(?=(\\?))\2.)*?\1/g;
    // Remove the first and last character from the matched string which contains the quote
    return value.match(regex).map((a) => a.slice(1, -1));
  }

  private generateEnumName(tableName: string, fieldName: string) {
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

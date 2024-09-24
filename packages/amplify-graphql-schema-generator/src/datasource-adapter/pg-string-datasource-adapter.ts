import { EnumType, Field, FieldDataType, FieldType, Index } from '../schema-representation';
import { StringDataSourceAdapter, EmptySchemaError, InvalidSchemaError } from './string-datasource-adapter';
import { toPascalCase } from 'graphql-transformer-common';

export interface PostgresIndex {
  tableName: string;
  indexName: string;
  columns: string[];
  constraintType: string;
}

export interface PostgresColumn {
  tableName: string;
  columnName: string;
  sequence: number;
  default: string;
  datatype: string;
  columnType: string;
  nullable: boolean;
  length: number | null | undefined;
}

type PostgresSchema = PostgresSchemaField[];

type PostgresSchemaField = {
  enum_name: string;
  enum_values: string;
  table_name: string;
  column_name: string;
  column_default: string;
  ordinal_position: number;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  character_maximum_length: number;
  index_columns: string;
  indexname: string;
  constraint_type: string;
};

export const expectedColumns = [
  'enum_name',
  'enum_values',
  'table_name',
  'column_name',
  'column_default',
  'ordinal_position',
  'data_type',
  'udt_name',
  'is_nullable',
  'character_maximum_length',
  'index_columns',
  'indexname',
  'constraint_type',
];

export class PostgresStringDataSourceAdapter extends StringDataSourceAdapter {
  private dbBuilder: any;

  private indexes: PostgresIndex[];

  private fields: PostgresColumn[];

  private tables: string[];

  private enums: Map<string, EnumType>;

  private readonly PRIMARY_KEY_INDEX_NAME = 'PRIMARY';

  protected setSchema(schema: PostgresSchema): void {
    this.setEnums(schema);
    this.setFields(schema);
    this.setIndexes(schema);
    this.setTables(schema);
  }

  protected validateSchema(schema: any[]): schema is PostgresSchema {
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
    const key = this.indexes.find((index) => index.tableName === tableName && index.constraintType === 'PRIMARY KEY');

    if (!key || key.columns.length == 0) {
      return null;
    }

    const index: Index = new Index(key.indexName);
    index.setFields(key.columns);

    return index;
  }

  public getIndexes(tableName: string): Index[] {
    const indexNames: string[] = [
      ...new Set(this.indexes.filter((i) => i.tableName === tableName && i.constraintType !== 'PRIMARY KEY').map((i) => i.indexName)),
    ];

    const tableIndexes = indexNames.map((indexName: string) => {
      const key = this.indexes.find((index) => index.tableName == tableName && index.indexName === indexName);
      const index: Index = new Index(indexName);
      index.setFields(key.columns);
      return index;
    });

    return tableIndexes;
  }

  protected setEnums(parsedSchema: PostgresSchema): void {
    this.enums = new Map<string, EnumType>();
    parsedSchema
      .filter(({ enum_name }) => !!enum_name)
      .forEach((row) => {
        const enumName = row.enum_name;
        const enumValues = row.enum_values.substring(1, row.enum_values.length - 1).split(',');
        const enumType: EnumType = {
          kind: 'Enum',
          name: toPascalCase([enumName]),
          values: enumValues,
        };

        this.enums.set(enumName, enumType);
      });
  }

  protected setTables(parsedSchema: PostgresSchema): void {
    this.tables = Array.from(new Set(parsedSchema.map(({ table_name }) => table_name)));
  }

  protected setFields(fields: PostgresSchema): void {
    this.fields = fields.map((item) => ({
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

  protected setIndexes(indexes: PostgresSchema): void {
    this.indexes = indexes
      .filter(({ index_columns }) => !!index_columns)
      .map((item) => ({
        tableName: item.table_name,
        columns: item.index_columns.split(', '),
        indexName: item.indexname,
        columnName: item.column_name,
        constraintType: item.constraint_type,
      }));
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
      case 'CIDR':
      case 'INET':
        fieldDatatype = 'AWSIPAddress';
        break;
      default:
        if (this.enums.has(columntype)) {
          fieldDatatype = 'ENUM';
        }
        break;
    }

    let result: FieldType;
    if (fieldDatatype === 'ENUM') {
      const enumName = this.getEnumName(columntype);
      const enumRef = this.enums.get(columntype);
      result = {
        kind: 'Enum',
        values: enumRef.values,
        name: enumName,
      };
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
}

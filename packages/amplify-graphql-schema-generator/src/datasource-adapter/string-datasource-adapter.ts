import { parse } from 'csv-parse/sync';
import { toPascalCase } from 'graphql-transformer-common';
import { singular } from 'pluralize';
import { Field, FieldType, Index, Model } from '../schema-representation';

export abstract class StringDataSourceAdapter {
  constructor(schema: string) {
    const parsedSchema = this.parseSchema(schema.trim());
    this.validateSchema(parsedSchema);
    this.setSchema(parsedSchema);
  }

  public abstract getTablesList(): string[];

  public abstract getFields(tableName: string): Field[];

  public abstract getPrimaryKey(tableName: string): Index | null;

  public abstract getIndexes(tableName: string): Index[];

  protected abstract mapDataType(datatype: string, nullable: boolean, tableName: string, fieldName: string, columnType: string): FieldType;

  protected abstract validateSchema(schema: any[]): void;

  protected abstract setSchema(schema: any[]): void;

  protected abstract setFields(fields: any[]): void;

  protected abstract setIndexes(indexes: any[]): void;

  protected abstract setTables(tables: any[]): void;

  protected parseSchema(schema: string): any[] {
    return parse(schema, {
      columns: true,
      // allows quotes to appear in fields
      // example: CREATE UNIQUE INDEX "todo_pkey"
      relax_quotes: true,
      cast: (value, context) => {
        if (value === 'NULL' || value === 'null') {
          return null;
        }
        return value;
      },
    });
  }

  public getModels(): Model[] {
    const tableNames = this.getTablesList();
    const models = [];
    for (const table of tableNames) {
      models.push(this.describeTable(table));
    }
    return models;
  }

  public describeTable(tableName: string): Model {
    // Retrieve the fields, primary key and indexes info
    const fields = this.getFields(tableName);
    const primaryKey = this.getPrimaryKey(tableName);
    const indexes = this.getIndexes(tableName);

    // Construct the model from the retrieved details
    const model = new Model(tableName);
    fields.forEach((field) => model.addField(field));
    primaryKey && model.setPrimaryKey(primaryKey.getFields());
    indexes.forEach((index) => model.addIndex(index.name, index.getFields()));
    return model;
  }

  protected getEnumName(name: string): string {
    return singular(toPascalCase(name.split('_')));
  }
}

export class EmptySchemaError extends Error {
  constructor() {
    super('Imported SQL schema is empty.');
  }
}
export class InvalidSchemaError extends Error {
  constructor(schema: any[], expectedColumns: string[]) {
    const columns = Object.keys(schema[0]);
    const missingColumns = expectedColumns.filter((column) => !columns.includes(column));
    const message = `Imported SQL schema is invalid. Imported schema is missing columns: ${missingColumns.join(', ')}`;
    super(message);
  }
}

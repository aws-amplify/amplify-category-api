import { Field, Index } from '../schema-representation';

export type IRSchemaInputs = {
  fields: any;
  indexes: any;
  tables: any;
};

export abstract class IRSchema {
  protected abstract setFields(fields: string): void;
  protected abstract setIndexes(indexes: string): void;
  protected abstract setTables(tables: string): void;
  public abstract getFields(tableName: string): Field[];
  public abstract getPrimaryKey(tableName: string): Index | null;
  public abstract getIndexes(tableName: string): Index[];

  constructor({ fields, indexes, tables }: IRSchemaInputs) {
    this.setFields(fields);
    this.setIndexes(indexes);
    this.setTables(tables);
  }
}

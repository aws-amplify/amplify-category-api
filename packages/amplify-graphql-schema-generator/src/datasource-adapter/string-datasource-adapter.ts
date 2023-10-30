import { IRSchema, IRSchemaInputs } from './ir-schema';
import { Field, FieldType, Index, Model } from '../schema-representation';

export abstract class StringDataSourceAdapter {
  protected schema: IRSchema;
  protected fields: any[];
  protected indexes: any[];
  protected tables: string[];

  protected abstract setSchema(inputs: IRSchemaInputs): void;
  protected abstract extractFieldsString(schema: string): string;
  protected abstract extractIndexesString(schema: string): string;
  protected abstract extractTablesString(schema: string): string;

  /*
  public abstract mapDataType(datatype: string, nullable: boolean, tableName: string, fieldName: string, columnType: string): FieldType;
  */
  constructor(schema: string) {
    this.parseSchema(schema);
  }

  private parseSchema(schema: string): void {
    const fields = this.extractFieldsString(schema);
    const indexes = this.extractIndexesString(schema);
    const tables = this.extractTablesString(schema);
    this.setSchema({
      fields,
      indexes,
      tables,
    });
  }

  public getModels(): Model[] {
    const models = [];
    for (const table of this.tables) {
      models.push(this.describeTable(table));
    }
    return models;
  }

  private describeTable(tableName: string): Model {
    // Retrieve the fields, primary key and indexes info
    const fields = this.schema.getFields(tableName);
    const primaryKey = this.schema.getPrimaryKey(tableName);
    const indexes = this.schema.getIndexes(tableName);

    // Construct the model from the retrieved details
    const model = new Model(tableName);
    fields.forEach((field) => model.addField(field));
    primaryKey && model.setPrimaryKey(primaryKey.getFields());
    indexes.forEach((index) => model.addIndex(index.name, index.getFields()));
    return model;
  }
}

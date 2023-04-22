import { Field, FieldType, Index, Model } from "../schema-representation";

export abstract class DataSourceAdapter {
  public abstract getTablesList(): Promise<string[]>;
  public abstract getFields(tableName: string): Promise<Field[]>;
  public abstract getPrimaryKey(tableName: string): Promise<Index | null>;
  public abstract getIndexes(tableName: string): Promise<Index[]>;
  public abstract mapDataType(datatype: string, nullable: boolean, tableName: string, fieldName:string, columnType: string): FieldType;
  public abstract initialize(): Promise<void>;
  public abstract cleanup(): void;

  public async getModels(): Promise<Model[]> {
    const tableNames = await this.getTablesList();
    const models = [];
    for (const table of tableNames) {
      models.push(await this.describeTable(table));
    };
    return models;
  }

  public async describeTable(tableName: string): Promise<Model> {
    // Retrieve the fields, primary key and indexes info
    const fields = await this.getFields(tableName);
    const primaryKey = await this.getPrimaryKey(tableName);
    const indexes = await this.getIndexes(tableName);
    
    // Construct the model from the retrieved details
    const model = new Model(tableName);
    fields.forEach(field => model.addField(field));
    primaryKey && model.setPrimaryKey(primaryKey.getFields());
    indexes.forEach(index => model.addIndex(index.name, index.getFields()));
    return model;
  } 
}

import * as os from 'os';
import { Field, Index, Model } from '../schema-representation';

export interface DataSourceConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslCertificate?: string;
}

export abstract class DataSourceAdapter {
  public abstract getTablesList(): string[];

  public abstract getFields(tableName: string): Field[];

  public abstract getPrimaryKey(tableName: string): Index | null;

  public abstract getIndexes(tableName: string): Index[];

  public abstract initialize(): Promise<void>;

  public abstract cleanup(): void;

  public abstract test(): Promise<boolean>;

  protected abstract querySchema(): Promise<string>;

  public useVPC = false;

  public vpcSchemaInspectorLambda: string | undefined = undefined;

  public vpcLambdaRegion: string | undefined = undefined;

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

  public useVpc(vpcSchemaInspectorLambda: string, region: string): void {
    this.useVPC = true;
    this.vpcSchemaInspectorLambda = vpcSchemaInspectorLambda;
    this.vpcLambdaRegion = region;
  }

  protected queryToCSV(queryResult: any[]): string {
    if (queryResult.length === 0) {
      return '';
    }
    const headers = Object.keys(queryResult[0]);
    const headerIndices = Object.fromEntries(headers.map((key, index) => [index, key]));
    const rows = queryResult.map((row) =>
      [...Array(headers.length).keys()]
        .map((index) => {
          const value = row[headerIndices[index]];
          // sanitize if comma is present in value
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          if (value === null) {
            return 'NULL';
          }
          return value;
        })
        .join(','),
    );
    return headers.join(',') + os.EOL + rows.join(os.EOL);
  }
}

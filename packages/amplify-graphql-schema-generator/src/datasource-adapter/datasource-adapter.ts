import * as os from 'os';
import { singular } from 'pluralize';
import { toPascalCase } from 'graphql-transformer-common';
import { Field, Index, Model } from '../schema-representation';

export abstract class DataSourceAdapter {
  public abstract getTablesList(): Promise<string[]>;

  public abstract getFields(tableName: string): Promise<Field[]>;

  public abstract getPrimaryKey(tableName: string): Promise<Index | null>;

  public abstract getIndexes(tableName: string): Promise<Index[]>;

  public abstract initialize(): Promise<void>;

  public abstract cleanup(): void;

  public abstract test(): Promise<boolean>;

  // todo correct function signature
  protected abstract querySchema(): Promise<string>;

  public useVPC = false;

  public vpcSchemaInspectorLambda: string | undefined = undefined;

  public vpcLambdaRegion: string | undefined = undefined;

  public async getModels(): Promise<Model[]> {
    const tableNames = await this.getTablesList();
    const models = [];
    for (const table of tableNames) {
      models.push(await this.describeTable(table));
    }
    return models;
  }

  public async describeTable(tableName: string): Promise<Model> {
    // Retrieve the fields, primary key and indexes info
    const fields = await this.getFields(tableName);
    const primaryKey = await this.getPrimaryKey(tableName);
    const indexes = await this.getIndexes(tableName);

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

  protected getEnumName(name: string): string {
    return singular(toPascalCase(name.split('_')));
  }

  protected queryToCSV(queryResult: any[]): string {
    if (queryResult.length === 0) {
      return '';
    }
    const headers = Object.keys(queryResult[0]);
    const headerIndices = Object.fromEntries(headers.map((key, index) => [index, key]));
    const rows = queryResult.slice(1).map((row) =>
      [...Array(headers.length).keys()]
        .map((index) => {
          const value = row[headerIndices[index]];
          // sanitize if comma is present in value
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        })
        .join(','),
    );
    return headers.join(',') + os.EOL + rows.join(os.EOL);
  }
}

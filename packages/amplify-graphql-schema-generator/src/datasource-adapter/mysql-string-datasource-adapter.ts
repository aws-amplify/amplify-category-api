import { MySQLIRSchema } from './mysql-ir-schema';
import { IRSchema, IRSchemaInputs } from './ir-schema';
import { StringDataSourceAdapter } from './string-datasource-adapter';

export class MySQLStringDataSourceAdapter extends StringDataSourceAdapter {
  protected setSchema(inputs: IRSchemaInputs): void {
    this.schema = new MySQLIRSchema(inputs);
  }

  protected extractFieldsString(schema: string): string {
    return '';
  }

  protected extractIndexesString(schema: string): string {
    return '';
  }

  protected extractTablesString(schema: string): string {
    return '';
  }
}

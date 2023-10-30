import { StringDataSourceAdapter } from './string-datasource-adapter';

export class MySQLStringDataSourceAdapter extends StringDataSourceAdapter {
  protected parseSchema(schema: string): void {
    console.log('parse my sql schema');
  }
}

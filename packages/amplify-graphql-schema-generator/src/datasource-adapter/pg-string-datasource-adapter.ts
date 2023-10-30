import { StringDataSourceAdapter } from './string-datasource-adapter';

export class PostgresStringDataSourceAdapter extends StringDataSourceAdapter {
  protected parseSchema(schema: string): void {
    console.log('parse pg schema');
  }
}
